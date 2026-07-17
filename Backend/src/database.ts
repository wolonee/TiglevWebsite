import postgres, { type Sql } from "postgres";
import { config } from "./config.js";

export type Subscriber = { chat_id: number; username: string | null; first_name: string | null; last_name: string | null };
export type CarRecord = {
  id: string; brand: string; model: string; price: number; year: number; images: string[];
  bodyType: string; engine: string; description?: string; engineVolume?: string; power?: string;
  transmission?: string; mileage?: number; drive?: string; wheel?: string; color?: string; damage?: string;
};

let sqlClient: Sql | null = null;
let schemaPromise: Promise<void> | null = null;

function getSql() {
  if (!sqlClient) sqlClient = postgres(config.DATABASE_URL, { max: 1, prepare: false, idle_timeout: 20 });
  return sqlClient;
}

export function ensureSchema() {
  if (!schemaPromise) {
    const sql = getSql();
    schemaPromise = sql.begin(async (transaction) => {
      await transaction`
      CREATE TABLE IF NOT EXISTS telegram_subscribers (
        chat_id BIGINT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
      `;
      await transaction`
        CREATE TABLE IF NOT EXISTS cars (
          id TEXT PRIMARY KEY,
          brand TEXT NOT NULL,
          model TEXT NOT NULL,
          price INTEGER NOT NULL CHECK (price > 0),
          year INTEGER NOT NULL,
          images JSONB NOT NULL,
          body_type TEXT NOT NULL,
          engine TEXT NOT NULL,
          description TEXT,
          engine_volume TEXT,
          power TEXT,
          transmission TEXT,
          mileage INTEGER,
          drive TEXT,
          wheel TEXT,
          color TEXT,
          damage TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    }).then(() => undefined);
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

const mapCar = (row: Record<string, unknown>): CarRecord => ({
  id: String(row.id), brand: String(row.brand), model: String(row.model), price: Number(row.price),
  year: Number(row.year), images: row.images as string[], bodyType: String(row.body_type), engine: String(row.engine),
  description: row.description ? String(row.description) : undefined,
  engineVolume: row.engine_volume ? String(row.engine_volume) : undefined,
  power: row.power ? String(row.power) : undefined,
  transmission: row.transmission ? String(row.transmission) : undefined,
  mileage: row.mileage == null ? undefined : Number(row.mileage),
  drive: row.drive ? String(row.drive) : undefined, wheel: row.wheel ? String(row.wheel) : undefined,
  color: row.color ? String(row.color) : undefined, damage: row.damage ? String(row.damage) : undefined,
});

export const carRecords = {
  async create(car: CarRecord) {
    await ensureSchema();
    const sql = getSql();
    const [row] = await sql`
      INSERT INTO cars (id, brand, model, price, year, images, body_type, engine, description,
        engine_volume, power, transmission, mileage, drive, wheel, color, damage)
      VALUES (${car.id}, ${car.brand}, ${car.model}, ${car.price}, ${car.year}, ${sql.json(car.images)},
        ${car.bodyType}, ${car.engine}, ${car.description ?? null}, ${car.engineVolume ?? null},
        ${car.power ?? null}, ${car.transmission ?? null}, ${car.mileage ?? null}, ${car.drive ?? null},
        ${car.wheel ?? null}, ${car.color ?? null}, ${car.damage ?? null})
      RETURNING *
    `;
    if (!row) throw new Error("Created car was not returned");
    return mapCar(row);
  },
  async all() {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT * FROM cars ORDER BY created_at DESC`;
    return rows.map(mapCar);
  },
  async find(id: string) {
    await ensureSchema();
    const sql = getSql();
    const [row] = await sql`SELECT * FROM cars WHERE id = ${id}`;
    return row ? mapCar(row) : null;
  },
};
