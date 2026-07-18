import postgres, { type Sql } from "postgres";
import { config } from "./config.js";
import { catalogSeed } from "./catalog-seed.js";

export type Subscriber = { chat_id: number; username: string | null; first_name: string | null; last_name: string | null };
export const carStatuses = ["draft", "active", "reserved", "sold", "hidden"] as const;
export type CarStatus = typeof carStatuses[number];
export type CarRecord = {
  id: string; brand: string; model: string; price: number; year: number; images: string[];
  bodyType: string; engine: string; description?: string; engineVolume?: string; power?: string;
  transmission?: string; mileage?: number; drive?: string; wheel?: string; color?: string; damage?: string;
  status: CarStatus; sortOrder: number;
};
export type RequestStatus = "new" | "in_progress" | "completed" | "archived";
export type AdminRequest = { id: string; kind: "contact" | "sell"; status: RequestStatus; payload: Record<string, unknown>; photoCount: number; note?: string; createdAt: string; updatedAt: string };

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
      await transaction`ALTER TABLE cars ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'reserved', 'sold', 'hidden'))`;
      await transaction`ALTER TABLE cars ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`;
      await transaction`
        CREATE TABLE IF NOT EXISTS customer_requests (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL CHECK (kind IN ('contact', 'sell')),
          status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'archived')),
          payload JSONB NOT NULL,
          photo_count INTEGER NOT NULL DEFAULT 0,
          note TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await transaction`CREATE TABLE IF NOT EXISTS app_migrations (key TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      const [catalogMigration] = await transaction`
        INSERT INTO app_migrations (key) VALUES ('catalog_seed_v1')
        ON CONFLICT (key) DO NOTHING RETURNING key
      `;
      if (catalogMigration) {
        for (const car of catalogSeed) {
          await transaction`
            INSERT INTO cars (id, brand, model, price, year, images, body_type, engine, description,
              engine_volume, power, transmission, mileage, drive, wheel, color, damage)
            VALUES (${car.id}, ${car.brand}, ${car.model}, ${car.price}, ${car.year}, ${transaction.json(car.images)},
              ${car.bodyType}, ${car.engine}, ${car.description ?? null}, ${car.engineVolume ?? null},
              ${car.power ?? null}, ${car.transmission ?? null}, ${car.mileage ?? null}, ${car.drive ?? null},
              ${car.wheel ?? null}, ${car.color ?? null}, ${car.damage ?? null})
            ON CONFLICT (id) DO NOTHING
          `;
        }
      }
      const [workflowMigration] = await transaction`
        INSERT INTO app_migrations (key) VALUES ('catalog_workflow_v1')
        ON CONFLICT (key) DO NOTHING RETURNING key
      `;
      if (workflowMigration) {
        await transaction`
          WITH ordered AS (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC, id) - 1 AS position FROM cars)
          UPDATE cars SET sort_order = ordered.position FROM ordered WHERE cars.id = ordered.id
        `;
      }
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
  status: row.status as CarStatus, sortOrder: Number(row.sort_order),
});

export const carRecords = {
  async create(car: Omit<CarRecord, "sortOrder">) {
    await ensureSchema();
    const sql = getSql();
    const [row] = await sql`
      INSERT INTO cars (id, brand, model, price, year, images, body_type, engine, description,
        engine_volume, power, transmission, mileage, drive, wheel, color, damage, status, sort_order)
      VALUES (${car.id}, ${car.brand}, ${car.model}, ${car.price}, ${car.year}, ${sql.json(car.images)},
        ${car.bodyType}, ${car.engine}, ${car.description ?? null}, ${car.engineVolume ?? null},
        ${car.power ?? null}, ${car.transmission ?? null}, ${car.mileage ?? null}, ${car.drive ?? null},
        ${car.wheel ?? null}, ${car.color ?? null}, ${car.damage ?? null}, ${car.status},
        COALESCE((SELECT MAX(sort_order) + 1 FROM cars), 0))
      RETURNING *
    `;
    if (!row) throw new Error("Created car was not returned");
    return mapCar(row);
  },
  async all() {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT * FROM cars ORDER BY sort_order ASC, created_at DESC`;
    return rows.map(mapCar);
  },
  async active() {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT * FROM cars WHERE status = 'active' ORDER BY sort_order ASC, created_at DESC`;
    return rows.map(mapCar);
  },
  async find(id: string) {
    await ensureSchema();
    const sql = getSql();
    const [row] = await sql`SELECT * FROM cars WHERE id = ${id}`;
    return row ? mapCar(row) : null;
  },
  async update(id: string, car: Omit<CarRecord, "id" | "sortOrder">) {
    await ensureSchema();
    const sql = getSql();
    const [row] = await sql`
      UPDATE cars SET brand = ${car.brand}, model = ${car.model}, price = ${car.price}, year = ${car.year},
        images = ${sql.json(car.images)}, body_type = ${car.bodyType}, engine = ${car.engine},
        description = ${car.description ?? null}, engine_volume = ${car.engineVolume ?? null},
        power = ${car.power ?? null}, transmission = ${car.transmission ?? null}, mileage = ${car.mileage ?? null},
        drive = ${car.drive ?? null}, wheel = ${car.wheel ?? null}, color = ${car.color ?? null}, damage = ${car.damage ?? null}, status = ${car.status}
      WHERE id = ${id} RETURNING *
    `;
    return row ? mapCar(row) : null;
  },
  async remove(id: string) {
    await ensureSchema();
    const sql = getSql();
    const [row] = await sql`DELETE FROM cars WHERE id = ${id} RETURNING *`;
    return row ? mapCar(row) : null;
  },
  async reorder(ids: string[]) {
    await ensureSchema();
    const sql = getSql();
    return sql.begin(async (transaction) => {
      for (const [index, id] of ids.entries()) await transaction`UPDATE cars SET sort_order = ${index} WHERE id = ${id}`;
      const rows = await transaction`SELECT * FROM cars ORDER BY sort_order ASC, created_at DESC`;
      return rows.map(mapCar);
    });
  },
};

const mapRequest = (row: Record<string, unknown>): AdminRequest => ({
  id: String(row.id), kind: row.kind as AdminRequest["kind"], status: row.status as RequestStatus,
  payload: row.payload as Record<string, unknown>, photoCount: Number(row.photo_count), note: row.note ? String(row.note) : undefined,
  createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString(),
});

export const customerRequests = {
  async create(data: Omit<AdminRequest, "status" | "note" | "createdAt" | "updatedAt">) {
    await ensureSchema(); const sql = getSql();
    const [row] = await sql`
      INSERT INTO customer_requests (id, kind, payload, photo_count) VALUES (${data.id}, ${data.kind}, ${sql.json(data.payload as never)}, ${data.photoCount})
      RETURNING *
    `;
    if (!row) throw new Error("Created request was not returned");
    return mapRequest(row);
  },
  async all() {
    await ensureSchema(); const sql = getSql();
    const rows = await sql`SELECT * FROM customer_requests ORDER BY created_at DESC`;
    return rows.map(mapRequest);
  },
  async update(id: string, data: { status: RequestStatus; note?: string }) {
    await ensureSchema(); const sql = getSql();
    const [row] = await sql`UPDATE customer_requests SET status = ${data.status}, note = ${data.note ?? null}, updated_at = NOW() WHERE id = ${id} RETURNING *`;
    return row ? mapRequest(row) : null;
  },
};
