import { getSql } from "./database.js";

/**
 * Своя аналитика посещений.
 *
 * Зачем не только внешний счётчик: главная цифра здесь не «сколько визитов»,
 * а воронка — сколько дошли до каталога, до карточки машины и до целевого
 * действия. Вытаскивать такое из отчётов Метрики по API муторно, а данные
 * и так лежат в нашей базе.
 *
 * Хранение в два слоя, потому что Neon на Free даёт 512 МБ на весь проект,
 * и там же живут заявки с сайта:
 *
 *   `events` — сырые события, живут 30 дней. Нужны, чтобы посмотреть
 *              вчерашний день в деталях.
 *   `daily`  — свёртка по дню и типу события, хранится всегда. Одна строка
 *              на день+тип+страницу вместо тысяч сырых.
 *
 * Без свёртки при тысяче визитов в сутки таблица набирала бы 15 МБ в месяц
 * и за год съела бы половину тарифа.
 */

export const EVENT_TYPES = ["pageview", "catalog", "lot", "outbound", "lead"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Сколько дней держим сырые события. Дальше остаётся только свёртка. */
const RAW_RETENTION_DAYS = 30;

let schemaReady: Promise<void> | null = null;

export function migrateAnalytics() {
  if (!schemaReady) {
    const sql = getSql();
    schemaReady = (async () => {
      await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS analytics`);
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS analytics.events (
          id          bigserial PRIMARY KEY,
          at          timestamptz NOT NULL DEFAULT now(),
          type        text NOT NULL,
          path        text NOT NULL,
          referrer    text,
          -- Кто зашёл: не человек, а анонимный отпечаток на сутки.
          -- Персональных данных не храним, IP тоже.
          visitor     text,
          device      text,
          -- Для outbound — id лота, чтобы видеть, по каким машинам уходят.
          lot_id      bigint,
          country     text,
          -- Куда ушёл: telegram | vk | max. Только для outbound.
          messenger   text
        )`);
      await sql.unsafe(
        `CREATE INDEX IF NOT EXISTS events_at_idx ON analytics.events (at DESC)`,
      );
      // Догоняем таблицы, созданные до появления колонки.
      await sql.unsafe(`ALTER TABLE analytics.events ADD COLUMN IF NOT EXISTS messenger text`);
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS analytics.daily (
          day       date NOT NULL,
          type      text NOT NULL,
          path      text NOT NULL,
          hits      integer NOT NULL DEFAULT 0,
          visitors  integer NOT NULL DEFAULT 0,
          PRIMARY KEY (day, type, path)
        )`);
    })();
  }
  return schemaReady;
}

/** Простые признаки робота. Их визиты в воронке только мешают. */
const BOT_PATTERN = /bot|crawl|spider|slurp|yandex|google|bing|preview|monitor|curl|wget|headless/i;

export function isBot(userAgent: string | undefined): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

export function deviceFrom(userAgent: string | undefined): string {
  if (!userAgent) return "unknown";
  if (/mobile|android|iphone/i.test(userAgent)) return "mobile";
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  return "desktop";
}

export type IncomingEvent = {
  type: string;
  path: string;
  referrer?: string;
  visitor?: string;
  lotId?: number;
  country?: string;
  messenger?: string;
};

export async function recordEvent(event: IncomingEvent, userAgent: string | undefined) {
  if (isBot(userAgent)) return { skipped: "bot" as const };
  if (!EVENT_TYPES.includes(event.type as EventType)) return { skipped: "type" as const };

  const path = (event.path || "/").slice(0, 300);
  await migrateAnalytics();
  const sql = getSql();
  await sql`
    INSERT INTO analytics.events (type, path, referrer, visitor, device, lot_id, country, messenger)
    VALUES (${event.type}, ${path}, ${event.referrer?.slice(0, 300) ?? null},
            ${event.visitor?.slice(0, 64) ?? null}, ${deviceFrom(userAgent)},
            ${event.lotId ?? null}, ${event.country?.slice(0, 40) ?? null},
            ${event.messenger?.slice(0, 20) ?? null})
  `;
  return { ok: true as const };
}

/**
 * Сворачивает вчерашние сырые события в суточные итоги и чистит старьё.
 * Идемпотентна: повторный запуск за тот же день перезапишет строки, а не удвоит.
 */
export async function rollup() {
  await migrateAnalytics();
  const sql = getSql();
  const rolledRows = (await sql`
    WITH rolled AS (
      INSERT INTO analytics.daily (day, type, path, hits, visitors)
      SELECT date_trunc('day', at)::date, type, path,
             COUNT(*)::int, COUNT(DISTINCT visitor)::int
      FROM analytics.events
      WHERE at < date_trunc('day', now())
      GROUP BY 1, 2, 3
      ON CONFLICT (day, type, path)
      DO UPDATE SET hits = EXCLUDED.hits, visitors = EXCLUDED.visitors
      RETURNING 1
    )
    SELECT COUNT(*)::int AS count FROM rolled
  `) as unknown as { count: number }[];
  const count = rolledRows[0]?.count ?? 0;

  await sql`
    DELETE FROM analytics.events
    WHERE at < now() - make_interval(days => ${RAW_RETENTION_DAYS})
  `;
  return { rolledRows: count };
}

export type Summary = {
  totals: { type: string; hits: number; visitors: number }[];
  byDay: { day: string; type: string; hits: number; visitors: number }[];
  topPages: { path: string; hits: number; visitors: number }[];
  topReferrers: { referrer: string; hits: number }[];
  devices: { device: string; hits: number }[];
  topLots: { lot_id: number; brand: string | null; model: string | null; hits: number }[];
  messengers: { messenger: string; hits: number }[];
};

/**
 * Сводка за N дней. Читает сырые события: в пределах месяца их немного,
 * а свёртка нужна для истории подлиннее.
 */
export async function summary(days: number): Promise<Summary> {
  await migrateAnalytics();
  const sql = getSql();
  const span = Math.min(Math.max(1, days), 90);

  const [totals, byDay, topPages, topReferrers, devices, topLots, messengers] = await Promise.all([
    sql`SELECT type, COUNT(*)::int AS hits, COUNT(DISTINCT visitor)::int AS visitors
        FROM analytics.events WHERE at > now() - make_interval(days => ${span})
        GROUP BY type`,
    sql`SELECT date_trunc('day', at)::date::text AS day, type,
               COUNT(*)::int AS hits, COUNT(DISTINCT visitor)::int AS visitors
        FROM analytics.events WHERE at > now() - make_interval(days => ${span})
        GROUP BY 1, 2 ORDER BY 1`,
    sql`SELECT path, COUNT(*)::int AS hits, COUNT(DISTINCT visitor)::int AS visitors
        FROM analytics.events WHERE at > now() - make_interval(days => ${span})
        GROUP BY path ORDER BY hits DESC LIMIT 20`,
    sql`SELECT COALESCE(NULLIF(referrer, ''), 'прямые заходы') AS referrer, COUNT(*)::int AS hits
        FROM analytics.events WHERE at > now() - make_interval(days => ${span})
          AND type = 'pageview'
        GROUP BY 1 ORDER BY hits DESC LIMIT 10`,
    sql`SELECT device, COUNT(*)::int AS hits
        FROM analytics.events WHERE at > now() - make_interval(days => ${span})
        GROUP BY device ORDER BY hits DESC`,
    // Лоты, по которым уходили на CarClick, — это и есть деньги арбитража.
    sql`SELECT e.lot_id, l.brand, l.model, COUNT(*)::int AS hits
        FROM analytics.events e
        LEFT JOIN catalog.lots l ON l.id = e.lot_id
        WHERE e.at > now() - make_interval(days => ${span})
          AND e.type = 'outbound' AND e.lot_id IS NOT NULL
        GROUP BY e.lot_id, l.brand, l.model ORDER BY hits DESC LIMIT 15`,
    sql`SELECT messenger, COUNT(*)::int AS hits FROM analytics.events
        WHERE at > now() - make_interval(days => ${span}) AND messenger IS NOT NULL
        GROUP BY messenger ORDER BY hits DESC`,
  ]);

  return {
    totals: totals as unknown as Summary["totals"],
    byDay: byDay as unknown as Summary["byDay"],
    topPages: topPages as unknown as Summary["topPages"],
    topReferrers: topReferrers as unknown as Summary["topReferrers"],
    devices: devices as unknown as Summary["devices"],
    topLots: topLots as unknown as Summary["topLots"],
    messengers: messengers as unknown as Summary["messengers"],
  };
}
