import postgres, { type Sql } from "postgres";
import { config } from "./config.js";

export type Subscriber = { chat_id: number; username: string | null; first_name: string | null; last_name: string | null };

let sqlClient: Sql | null = null;
let schemaPromise: Promise<void> | null = null;

function getSql() {
  if (!sqlClient) sqlClient = postgres(config.DATABASE_URL, { max: 1, prepare: false, idle_timeout: 20 });
  return sqlClient;
}

export function ensureSchema() {
  if (!schemaPromise) {
    const sql = getSql();
    schemaPromise = sql`
      CREATE TABLE IF NOT EXISTS telegram_subscribers (
        chat_id BIGINT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined);
  }
  return schemaPromise;
}

export const subscribers = {
  async upsert(data: { chatId: number; username?: string; firstName?: string; lastName?: string }) {
    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO telegram_subscribers (chat_id, username, first_name, last_name)
      VALUES (${data.chatId}, ${data.username ?? null}, ${data.firstName ?? null}, ${data.lastName ?? null})
      ON CONFLICT (chat_id) DO UPDATE SET username = EXCLUDED.username, first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name, updated_at = NOW()
    `;
  },
  async remove(chatId: number) {
    await ensureSchema();
    const sql = getSql();
    await sql`DELETE FROM telegram_subscribers WHERE chat_id = ${chatId}`;
  },
  async all(): Promise<Subscriber[]> {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT chat_id, username, first_name, last_name FROM telegram_subscribers ORDER BY created_at`;
    return rows.map((row) => ({ ...row, chat_id: Number(row.chat_id) })) as Subscriber[];
  },
};
