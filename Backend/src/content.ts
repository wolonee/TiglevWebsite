import { getSql } from "./database.js";

/**
 * Тексты и контакты сайта, которыми управляет администратор.
 *
 * Один документ, а не таблица полей: разделы правятся целиком (меню, первый
 * экран, контакты), и разбивать их на строки означало бы собирать документ
 * обратно на каждый запрос страницы. Проверку структуры делает маршрут — здесь
 * только хранение.
 *
 * История сохраняется: правка текста на живом сайте — это то, что хочется
 * откатить, когда через день выяснилось, что телефон вписали с опечаткой.
 */

/** Разобранный и проверенный документ. Форму задаёт схема в маршруте. */
export type ContentDocument = Record<string, unknown>;

const KEY = "site";
/** Сколько прошлых версий храним. Дальше смысла нет, а место на Neon не резиновое. */
const HISTORY_LIMIT = 20;

let schemaReady: Promise<void> | null = null;

export function migrateContent() {
  if (!schemaReady) {
    const sql = getSql();
    schemaReady = (async () => {
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS site_content (
          key        text PRIMARY KEY,
          value      jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )`);
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS site_content_history (
          id         bigserial PRIMARY KEY,
          key        text NOT NULL,
          value      jsonb NOT NULL,
          saved_at   timestamptz NOT NULL DEFAULT now()
        )`);
    })();
  }
  return schemaReady;
}

export const siteContent = {
  /** Сохранённый документ или null, если администратор ничего не менял. */
  async get(): Promise<ContentDocument | null> {
    await migrateContent();
    const sql = getSql();
    const rows = (await sql`SELECT value FROM site_content WHERE key = ${KEY}`) as unknown as { value: ContentDocument }[];
    return rows[0]?.value ?? null;
  },

  async save(value: ContentDocument): Promise<ContentDocument> {
    await migrateContent();
    const sql = getSql();
    await sql.begin(async (transaction) => {
      // Предыдущую версию в историю до перезаписи, иначе откатывать будет не к чему.
      await transaction`
        INSERT INTO site_content_history (key, value)
        SELECT key, value FROM site_content WHERE key = ${KEY}
      `;
      await transaction`
        INSERT INTO site_content (key, value, updated_at) VALUES (${KEY}, ${transaction.json(value as never)}, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
      await transaction`
        DELETE FROM site_content_history WHERE key = ${KEY} AND id NOT IN (
          SELECT id FROM site_content_history WHERE key = ${KEY} ORDER BY id DESC LIMIT ${HISTORY_LIMIT}
        )
      `;
    });
    return value;
  },

  /** Прошлые версии, свежие сверху. Для кнопки «вернуть как было». */
  async history(): Promise<{ id: number; value: ContentDocument; savedAt: string }[]> {
    await migrateContent();
    const sql = getSql();
    const rows = (await sql`
      SELECT id, value, saved_at FROM site_content_history
      WHERE key = ${KEY} ORDER BY id DESC LIMIT ${HISTORY_LIMIT}
    `) as unknown as { id: number; value: ContentDocument; saved_at: string }[];
    return rows.map((row) => ({ id: Number(row.id), value: row.value, savedAt: row.saved_at }));
  },
};
