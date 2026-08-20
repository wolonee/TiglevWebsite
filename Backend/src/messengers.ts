import { getSql } from "./database.js";

/**
 * Каналы связи, которые видит покупатель на карточке машины.
 *
 * Раньше их задавали переменными окружения (`NEXT_PUBLIC_TELEGRAM_USERNAME`
 * и подобными). Это плохо работало на практике: чтобы отключить мессенджер,
 * с которым перестали работать, нужно было править переменную на Vercel и
 * дожидаться пересборки, а забытая переменная просто убирала кнопку молча.
 *
 * Теперь список лежит в базе и меняется из админки. Шаблон ссылки хранится
 * вместе с каналом, поэтому добавить WhatsApp или Viber можно, не трогая код:
 * в шаблоне подставляются `{handle}` и `{message}`.
 */

export type MessengerChannel = {
  id: string;
  label: string;
  handle: string;
  /** Шаблон ссылки: `https://t.me/{handle}?text={message}`. */
  urlTemplate: string;
  /** Ссылка сама подставляет текст в поле ввода. Так умеет только Telegram. */
  prefillsMessage: boolean;
  enabled: boolean;
  position: number;
};

/**
 * Начальный набор. Заводится один раз, дальше живёт своей жизнью: удалённый
 * из админки канал не должен возвращаться при следующем запуске сервера.
 */
const SEED: MessengerChannel[] = [
  {
    id: "telegram",
    label: "Telegram",
    handle: "NARCI33IST",
    urlTemplate: "https://t.me/{handle}?text={message}",
    prefillsMessage: true,
    enabled: true,
    position: 0,
  },
  {
    id: "vk",
    label: "VK",
    handle: "prosto_tigl",
    urlTemplate: "https://vk.me/{handle}",
    prefillsMessage: false,
    enabled: true,
    position: 1,
  },
];

let schemaReady: Promise<void> | null = null;

export function migrateMessengers() {
  if (!schemaReady) {
    const sql = getSql();
    schemaReady = (async () => {
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS messenger_channels (
          id                text PRIMARY KEY,
          label             text NOT NULL,
          handle            text NOT NULL,
          url_template      text NOT NULL,
          prefills_message  boolean NOT NULL DEFAULT false,
          enabled           boolean NOT NULL DEFAULT true,
          position          integer NOT NULL DEFAULT 0,
          updated_at        timestamptz NOT NULL DEFAULT now()
        )`);
      await sql.unsafe(
        `CREATE TABLE IF NOT EXISTS app_migrations (key TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
      );
      // Через app_migrations, а не `ON CONFLICT DO NOTHING`: иначе удалённый
      // из админки Telegram воскресал бы при каждом перезапуске.
      const seeded = await sql`
        INSERT INTO app_migrations (key) VALUES ('messenger_channels_v1')
        ON CONFLICT (key) DO NOTHING RETURNING key
      `;
      if (seeded.length) {
        for (const channel of SEED) await upsert(channel);
      }
    })();
  }
  return schemaReady;
}

type Row = {
  id: string; label: string; handle: string; url_template: string;
  prefills_message: boolean; enabled: boolean; position: number;
};

const toChannel = (row: Row): MessengerChannel => ({
  id: row.id,
  label: row.label,
  handle: row.handle,
  urlTemplate: row.url_template,
  prefillsMessage: row.prefills_message,
  enabled: row.enabled,
  position: row.position,
});

async function upsert(channel: MessengerChannel) {
  const sql = getSql();
  await sql`
    INSERT INTO messenger_channels (id, label, handle, url_template, prefills_message, enabled, position, updated_at)
    VALUES (${channel.id}, ${channel.label}, ${channel.handle}, ${channel.urlTemplate},
            ${channel.prefillsMessage}, ${channel.enabled}, ${channel.position}, now())
    ON CONFLICT (id) DO UPDATE SET
      label = EXCLUDED.label, handle = EXCLUDED.handle, url_template = EXCLUDED.url_template,
      prefills_message = EXCLUDED.prefills_message, enabled = EXCLUDED.enabled,
      position = EXCLUDED.position, updated_at = now()
  `;
}

export const messengerChannels = {
  /** Всё, что есть, включая выключенное. Для админки. */
  async all(): Promise<MessengerChannel[]> {
    await migrateMessengers();
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM messenger_channels ORDER BY position, id
    `) as unknown as Row[];
    return rows.map(toChannel);
  },

  /** Только включённые. Это и видит покупатель. */
  async enabled(): Promise<MessengerChannel[]> {
    return (await messengerChannels.all()).filter((channel) => channel.enabled);
  },

  /**
   * Заменяет список целиком.
   *
   * Целиком, а не по одной записи, потому что админка правит таблицу как одно
   * целое — вместе с порядком кнопок и удалениями. Одной транзакцией, чтобы
   * сорвавшийся запрос не оставил сайт вообще без связи.
   */
  async replace(channels: MessengerChannel[]): Promise<MessengerChannel[]> {
    await migrateMessengers();
    const sql = getSql();
    await sql.begin(async (transaction) => {
      const keep = channels.map((channel) => channel.id);
      if (keep.length) {
        await transaction`DELETE FROM messenger_channels WHERE id <> ALL(${keep})`;
      } else {
        await transaction`DELETE FROM messenger_channels`;
      }
      for (const [index, channel] of channels.entries()) {
        await transaction`
          INSERT INTO messenger_channels (id, label, handle, url_template, prefills_message, enabled, position, updated_at)
          VALUES (${channel.id}, ${channel.label}, ${channel.handle}, ${channel.urlTemplate},
                  ${channel.prefillsMessage}, ${channel.enabled}, ${index}, now())
          ON CONFLICT (id) DO UPDATE SET
            label = EXCLUDED.label, handle = EXCLUDED.handle, url_template = EXCLUDED.url_template,
            prefills_message = EXCLUDED.prefills_message, enabled = EXCLUDED.enabled,
            position = EXCLUDED.position, updated_at = now()
        `;
      }
    });
    return messengerChannels.all();
  },
};
