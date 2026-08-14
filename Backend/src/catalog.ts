import { getSql } from "./database.js";

/**
 * Каталог CarClick: чтение из схемы `catalog`, которую наполняет парсер.
 *
 * Раньше витрина ходила в эту схему напрямую из серверных компонентов Next.
 * Работало и было безопасно (в браузер ничего из базы не попадает), но схему
 * знали два проекта сразу: поменяв структуру `catalog.lots`, править надо было
 * в обоих. Здесь единственный владелец данных, витрина ходит по HTTP.
 *
 * Ленту листаем курсором, а не OFFSET: каталог живой, 600–700 новых машин
 * в сутки, и вставки сдвигают выдачу — на середине ленты человек увидел бы
 * дубли и пропуски.
 *
 * Имена таблиц всегда со схемой. `SET search_path` использовать нельзя:
 * Neon работает через пулер, и `SET` протекает между клиентами.
 */

export type NumericRange = { from: number; to: number | null };

export type CatalogFilters = {
  country: string[]; brand: string[]; model: string[]; body: string[];
  condition: string[]; fuel: string[]; transmission: string[]; drive: string[];
  year: string[]; color: string[]; delivery: string[]; avail: string[];
  price: NumericRange | null;
  mileage: NumericRange | null;
  /** Мощность в л.с. Нужна для сегмента «до 160 л.с.» — налогового порога. */
  hp: NumericRange | null;
  /** id опций; условие «И» — машина должна иметь все выбранные. */
  opt: number[];
};

export const emptyFilters: CatalogFilters = {
  country: [], brand: [], model: [], body: [], condition: [], fuel: [],
  transmission: [], drive: [], year: [], color: [], delivery: [], avail: [],
  price: null, mileage: null, hp: null, opt: [],
};

const MULTI_KEYS = [
  "country", "brand", "model", "body", "condition", "fuel",
  "transmission", "drive", "year", "color", "delivery", "avail",
] as const;

const splitList = (value: string | undefined): string[] =>
  value ? value.split(",").map((part) => part.trim()).filter(Boolean) : [];

function parseRange(value: string | undefined): NumericRange | null {
  if (!value) return null;
  const [rawFrom, rawTo] = value.split("-");
  const from = Number(rawFrom);
  if (!Number.isFinite(from)) return null;
  const to = rawTo === "" || rawTo == null ? null : Number(rawTo);
  return { from, to: to != null && Number.isFinite(to) ? to : null };
}

/** Разбирает те же параметры, что кладёт `serializeFilters` во фронте. */
export function parseFilters(query: Record<string, unknown>): CatalogFilters {
  const get = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : undefined);
  const filters = { ...emptyFilters } as CatalogFilters;
  for (const key of MULTI_KEYS) filters[key] = splitList(get(key));
  filters.price = parseRange(get("price"));
  filters.mileage = parseRange(get("mileage"));
  filters.hp = parseRange(get("hp"));
  filters.opt = splitList(get("opt")).map(Number).filter(Number.isFinite);
  return filters;
}

/** Собирает условия и параметры. Значения только через плейсхолдеры. */
function buildWhere(filters: CatalogFilters, cursor?: number) {
  const conditions: string[] = ["l.gone_at IS NULL"];
  const params: unknown[] = [];
  const add = (value: unknown) => `$${params.push(value)}`;

  const inList = (column: string, values: string[]) => {
    if (values.length) conditions.push(`l.${column} = ANY(${add(values)})`);
  };

  inList("country_code", filters.country);
  inList("brand_code", filters.brand);
  inList("model_code", filters.model);
  inList("body_type", filters.body);
  inList("condition", filters.condition);
  inList("fuel", filters.fuel);
  inList("transmission", filters.transmission);
  inList("drive", filters.drive);
  inList("color_exterior", filters.color);

  if (filters.year.length) conditions.push(`l.year = ANY(${add(filters.year.map(Number))})`);
  if (filters.delivery.length) {
    conditions.push(`l.delivery_time = ANY(${add(filters.delivery.map(Number))})`);
  }

  const range = (column: string, value: NumericRange | null) => {
    if (!value) return;
    conditions.push(`l.${column} >= ${add(value.from)}`);
    // Верхняя граница исключающая: иначе машина за 5 млн попадёт сразу в два интервала.
    if (value.to != null) conditions.push(`l.${column} < ${add(value.to)}`);
  };
  range("price_individual", filters.price);
  range("mileage", filters.mileage);
  range("hp", filters.hp);

  // Одно условие на все опции, и это именно «И»: «содержит весь массив».
  if (filters.opt.length) conditions.push(`l.option_ids @> ${add(filters.opt)}`);
  if (cursor != null) conditions.push(`l.id < ${add(cursor)}`);

  return { where: conditions.join(" AND "), params };
}

const SELECT_COLUMNS = `
  l.id, l.brand, l.brand_code, l.model, l.model_code, l.generation, l.body_type,
  l.year, l.mileage, l.fuel, l.transmission, l.drive, l.volume, l.hp,
  l.color_exterior, l.condition, l.country, l.country_code, l.delivery_time,
  l.price_individual, l.option_ids, l.image_paths, p.prefix AS image_prefix
`;

export const PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

export type LotRow = Record<string, unknown>;

export async function fetchCatalogPage(
  filters: CatalogFilters,
  cursor?: number,
  limit: number = PAGE_SIZE,
): Promise<{ rows: LotRow[]; nextCursor: number | null }> {
  const size = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const { where, params } = buildWhere(filters, cursor);
  const rows = (await getSql().unsafe(
    `SELECT ${SELECT_COLUMNS}
     FROM catalog.lots l
     LEFT JOIN catalog.image_prefixes p ON p.id = l.image_prefix_id
     WHERE ${where}
     ORDER BY l.id DESC
     LIMIT $${params.length + 1}`,
    [...params, size] as never[],
  )) as unknown as LotRow[];

  // Курсор отдаём только когда страница полная: иначе лента запросит пустой хвост.
  const last = rows[rows.length - 1];
  const nextCursor = rows.length === size && last ? Number(last.id) : null;
  return { rows, nextCursor };
}

/** Сколько машин под текущим фильтром — для кнопки «Показать N». */
export async function countCatalog(filters: CatalogFilters): Promise<number> {
  const { where, params } = buildWhere(filters);
  const rows = (await getSql().unsafe(
    `SELECT COUNT(*)::int AS total FROM catalog.lots l WHERE ${where}`,
    params as never[],
  )) as unknown as { total: number }[];
  return rows[0]?.total ?? 0;
}

export type LotOption = { id: number; name: string; group: string | null };

/**
 * Один лот целиком. `null`, если лота нет или он снят с продажи — страница
 * тогда отдаёт 404, а не пустую карточку.
 *
 * Названия опций достаём отдельным запросом по справочнику: в строке лота
 * лежат только их идентификаторы.
 */
export async function fetchLot(
  lotId: number,
): Promise<{ row: LotRow; options: LotOption[] } | null> {
  const sql = getSql();
  const rows = (await sql.unsafe(
    `SELECT ${SELECT_COLUMNS},
            l.equipment, l.color_interior, l.description, l.is_foreign,
            l.price_individual_eaeu, l.price_legal, l.min_scenario_price, l.month
     FROM catalog.lots l
     LEFT JOIN catalog.image_prefixes p ON p.id = l.image_prefix_id
     WHERE l.id = $1 AND l.gone_at IS NULL
     LIMIT 1`,
    [lotId] as never[],
  )) as unknown as LotRow[];

  const row = rows[0];
  if (!row) return null;

  const ids = (row.option_ids as number[] | null) ?? [];
  if (!ids.length) return { row, options: [] };

  const options = (await sql.unsafe(
    `SELECT id, name, group_title AS "group" FROM catalog.options
     WHERE id = ANY($1) ORDER BY group_title NULLS LAST, name`,
    [ids] as never[],
  )) as unknown as LotOption[];

  return { row, options };
}
