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
  status: CarStatus; sortOrder: number; deletedAt?: string;
};
export type CarChangeAction = "created" | "updated" | "deleted" | "restored";
export type CarChange = { id: number; carId: string; action: CarChangeAction; changes: Record<string, unknown>; createdAt: string };
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
      await transaction`ALTER TABLE cars ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
      await transaction`ALTER TABLE cars ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
      await transaction`
        CREATE TABLE IF NOT EXISTS car_change_history (
          id BIGSERIAL PRIMARY KEY,
          car_id TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
          action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'restored')),
          changes JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await transaction`CREATE INDEX IF NOT EXISTS car_change_history_car_id_idx ON car_change_history (car_id, created_at DESC)`;
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
  deletedAt: row.deleted_at ? new Date(String(row.deleted_at)).toISOString() : undefined,
});

const carSnapshot = (car: CarRecord) => ({
  brand: car.brand, model: car.model, price: car.price, year: car.year, images: car.images,
  bodyType: car.bodyType, engine: car.engine, description: car.description, engineVolume: car.engineVolume,
  power: car.power, transmission: car.transmission, mileage: car.mileage, drive: car.drive,
  wheel: car.wheel, color: car.color, damage: car.damage, status: car.status,
});

const mapChange = (row: Record<string, unknown>): CarChange => ({
  id: Number(row.id), carId: String(row.car_id), action: row.action as CarChangeAction,
  changes: row.changes as Record<string, unknown>, createdAt: new Date(String(row.created_at)).toISOString(),
});

export const carRecords = {
  async create(car: Omit<CarRecord, "sortOrder" | "deletedAt">) {
    await ensureSchema();
    const sql = getSql();
    return sql.begin(async (transaction) => {
      const [row] = await transaction`
        INSERT INTO cars (id, brand, model, price, year, images, body_type, engine, description,
          engine_volume, power, transmission, mileage, drive, wheel, color, damage, status, sort_order)
        VALUES (${car.id}, ${car.brand}, ${car.model}, ${car.price}, ${car.year}, ${transaction.json(car.images)},
          ${car.bodyType}, ${car.engine}, ${car.description ?? null}, ${car.engineVolume ?? null},
          ${car.power ?? null}, ${car.transmission ?? null}, ${car.mileage ?? null}, ${car.drive ?? null},
          ${car.wheel ?? null}, ${car.color ?? null}, ${car.damage ?? null}, ${car.status},
          COALESCE((SELECT MAX(sort_order) + 1 FROM cars WHERE deleted_at IS NULL), 0)) RETURNING *
      `;
      if (!row) throw new Error("Created car was not returned");
      const created = mapCar(row);
      await transaction`INSERT INTO car_change_history (car_id, action, changes) VALUES (${car.id}, 'created', ${transaction.json({ after: carSnapshot(created) } as never)})`;
      return created;
    });
  },
  async all(deleted = false) {
    await ensureSchema();
    const sql = getSql();
    const rows = deleted
      ? await sql`SELECT * FROM cars WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
      : await sql`SELECT * FROM cars WHERE deleted_at IS NULL ORDER BY sort_order ASC, created_at DESC`;
    return rows.map(mapCar);
  },
  async active() {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT * FROM cars WHERE status = 'active' AND deleted_at IS NULL ORDER BY sort_order ASC, created_at DESC`;
    return rows.map(mapCar);
  },
  async find(id: string, includeDeleted = false) {
    await ensureSchema();
    const sql = getSql();
    const [row] = includeDeleted
      ? await sql`SELECT * FROM cars WHERE id = ${id}`
      : await sql`SELECT * FROM cars WHERE id = ${id} AND deleted_at IS NULL`;
    return row ? mapCar(row) : null;
  },
  async update(id: string, car: Omit<CarRecord, "id" | "sortOrder">) {
    await ensureSchema();
    const sql = getSql();
    return sql.begin(async (transaction) => {
      const [previousRow] = await transaction`SELECT * FROM cars WHERE id = ${id} AND deleted_at IS NULL`;
      if (!previousRow) return null;
      const [row] = await transaction`
        UPDATE cars SET brand = ${car.brand}, model = ${car.model}, price = ${car.price}, year = ${car.year},
          images = ${transaction.json(car.images)}, body_type = ${car.bodyType}, engine = ${car.engine},
          description = ${car.description ?? null}, engine_volume = ${car.engineVolume ?? null}, power = ${car.power ?? null},
          transmission = ${car.transmission ?? null}, mileage = ${car.mileage ?? null}, drive = ${car.drive ?? null},
          wheel = ${car.wheel ?? null}, color = ${car.color ?? null}, damage = ${car.damage ?? null}, status = ${car.status}, updated_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL RETURNING *
      `;
      if (!row) return null;
      const before = mapCar(previousRow); const updated = mapCar(row);
      await transaction`INSERT INTO car_change_history (car_id, action, changes) VALUES (${id}, 'updated', ${transaction.json({ before: carSnapshot(before), after: carSnapshot(updated) } as never)})`;
      return updated;
    });
  },
  async remove(id: string) {
    await ensureSchema();
    const sql = getSql();
    return sql.begin(async (transaction) => {
      const [row] = await transaction`UPDATE cars SET deleted_at = NOW(), updated_at = NOW() WHERE id = ${id} AND deleted_at IS NULL RETURNING *`;
      if (!row) return null;
      await transaction`INSERT INTO car_change_history (car_id, action, changes) VALUES (${id}, 'deleted', ${transaction.json({ before: carSnapshot(mapCar(row)) } as never)})`;
      return mapCar(row);
    });
  },
  async restore(id: string) {
    await ensureSchema(); const sql = getSql();
    return sql.begin(async (transaction) => {
      const [row] = await transaction`UPDATE cars SET deleted_at = NULL, updated_at = NOW() WHERE id = ${id} AND deleted_at IS NOT NULL RETURNING *`;
      if (!row) return null;
      await transaction`INSERT INTO car_change_history (car_id, action, changes) VALUES (${id}, 'restored', ${transaction.json({ after: carSnapshot(mapCar(row)) } as never)})`;
      return mapCar(row);
    });
  },
  async history(id: string) {
    await ensureSchema(); const sql = getSql();
    const rows = await sql`SELECT * FROM car_change_history WHERE car_id = ${id} ORDER BY created_at DESC, id DESC`;
    return rows.map(mapChange);
  },
  async reorder(ids: string[]) {
    await ensureSchema();
    const sql = getSql();
    return sql.begin(async (transaction) => {
      for (const [index, id] of ids.entries()) await transaction`UPDATE cars SET sort_order = ${index} WHERE id = ${id}`;
      const rows = await transaction`SELECT * FROM cars WHERE deleted_at IS NULL ORDER BY sort_order ASC, created_at DESC`;
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
