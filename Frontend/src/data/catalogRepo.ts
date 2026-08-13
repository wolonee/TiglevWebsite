import "server-only";

import { sql } from "@/lib/db";
import type { Car } from "./cars";
import { CARCLICK_SOURCE } from "./catalogSource";
import { normalizeCarImages } from "./carImages";
import type { CatalogFilters } from "@/lib/catalogFilters";

/**
 * Чтение каталога CarClick из Postgres.
 *
 * Ленту листаем курсором, а не OFFSET: каталог живой, 600–700 новых машин
 * в сутки. При OFFSET человек на середине ленты увидит дубли и пропуски,
 * потому что вставки сдвигают выдачу.
 *
 * Галерея лежит массивом `image_paths` плюс `image_prefix_id` — все фото лота
 * из одного источника, поэтому префикс один на строку и склеивается здесь.
 * Отдельных таблиц `images` и `lot_options` нет: они занимали 343 МБ против
 * 68 МБ у массивов.
 */

export const PAGE_SIZE = 24;

type LotRow = {
  id: string;
  brand: string | null;
  brand_code: string | null;
  model: string | null;
  model_code: string | null;
  generation: string | null;
  body_type: string | null;
  year: number | null;
  mileage: number | null;
  fuel: string | null;
  transmission: string | null;
  drive: string | null;
  volume: number | null;
  hp: number | null;
  color_exterior: string | null;
  condition: string | null;
  country: string | null;
  country_code: string | null;
  delivery_time: number | null;
  price_individual: string | number | null;
  option_ids: number[] | null;
  image_prefix: string | null;
  image_paths: string[] | null;
};

const toNumber = (value: string | number | null): number =>
  value == null ? 0 : typeof value === "number" ? value : Number(value);

/** «3» → «3.0 л». Нулевой объём у электромобилей — не показываем. */
const formatVolume = (volume: number | null): string | undefined =>
  volume == null || volume <= 0 ? undefined : `${volume.toFixed(1)} л`;

function toCar(row: LotRow): Car {
  const prefix = row.image_prefix ?? "";
  const urls = (row.image_paths ?? []).map((path) => `${prefix}${path}`);
  const images = normalizeCarImages(urls);

  return {
    id: `cc-${row.id}`,
    source: CARCLICK_SOURCE,
    brand: (row.brand ?? "").trim(),
    model: (row.model ?? "").trim(),
    brandCode: row.brand_code ?? undefined,
    modelCode: row.model_code ?? undefined,
    generation: row.generation ?? undefined,
    price: toNumber(row.price_individual),
    year: row.year ?? 0,
    image: images[0]?.url ?? "",
    images,
    // «другое» — это отсутствие данных, а не тип кузова.
    bodyType: row.body_type && row.body_type !== "другое" ? row.body_type : "",
    engine: row.fuel ?? "",
    fuel: row.fuel ?? undefined,
    transmission: row.transmission ?? undefined,
    drive: row.drive ?? undefined,
    engineVolume: formatVolume(row.volume),
    power: row.hp ? String(row.hp) : undefined,
    mileage: row.mileage ?? undefined,
    colorHex: row.color_exterior ?? undefined,
    condition: row.condition === "new" ? "new" : "used",
    country: row.country ?? undefined,
    countryCode: row.country_code ?? undefined,
    deliveryTime: row.delivery_time ?? undefined,
    options: row.option_ids ?? [],
  };
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

  if (filters.year.length) {
    conditions.push(`l.year = ANY(${add(filters.year.map(Number))})`);
  }
  if (filters.delivery.length) {
    conditions.push(`l.delivery_time = ANY(${add(filters.delivery.map(Number))})`);
  }

  const range = (column: string, value: { from: number; to: number | null } | null) => {
    if (!value) return;
    conditions.push(`l.${column} >= ${add(value.from)}`);
    // Верхняя граница исключающая: иначе машина за 5 млн попадёт сразу в два интервала.
    if (value.to != null) conditions.push(`l.${column} < ${add(value.to)}`);
  };
  range("price_individual", filters.price);
  range("mileage", filters.mileage);

  // Одно условие на все опции, и это именно «И»: «содержит весь массив».
  if (filters.opt.length) {
    conditions.push(`l.option_ids @> ${add(filters.opt)}`);
  }
  if (cursor != null) {
    conditions.push(`l.id < ${add(cursor)}`);
  }

  return { where: conditions.join(" AND "), params };
}

const SELECT_COLUMNS = `
  l.id, l.brand, l.brand_code, l.model, l.model_code, l.generation, l.body_type,
  l.year, l.mileage, l.fuel, l.transmission, l.drive, l.volume, l.hp,
  l.color_exterior, l.condition, l.country, l.country_code, l.delivery_time,
  l.price_individual, l.option_ids, l.image_paths, p.prefix AS image_prefix
`;

export type CatalogPage = {
  cars: Car[];
  /** id последней карточки; передать его в следующий запрос ленты. */
  nextCursor: number | null;
};

export async function fetchCatalogPage(
  filters: CatalogFilters,
  cursor?: number,
  limit: number = PAGE_SIZE,
): Promise<CatalogPage> {
  const { where, params } = buildWhere(filters, cursor);
  const rows = (await sql.query(
    `SELECT ${SELECT_COLUMNS}
     FROM catalog.lots l
     LEFT JOIN catalog.image_prefixes p ON p.id = l.image_prefix_id
     WHERE ${where}
     ORDER BY l.id DESC
     LIMIT $${params.length + 1}`,
    [...params, limit],
  )) as LotRow[];

  const cars = rows.map(toCar);
  // Курсор отдаём только когда страница полная: иначе лента запросит пустой хвост.
  const nextCursor = rows.length === limit ? Number(rows[rows.length - 1].id) : null;
  return { cars, nextCursor };
}

/** Сколько машин под текущим фильтром — для кнопки «Показать N». */
export async function countCatalog(filters: CatalogFilters): Promise<number> {
  const { where, params } = buildWhere(filters);
  const rows = (await sql.query(
    `SELECT COUNT(*)::int AS total FROM catalog.lots l WHERE ${where}`,
    params,
  )) as { total: number }[];
  return rows[0]?.total ?? 0;
}

/** Опция автомобиля с названием и группой — для страницы лота. */
export type LotOption = { id: number; name: string; group: string | null };

export type LotDetail = {
  car: Car;
  options: LotOption[];
  /** Цена для юрлица. У большинства лотов источник пишет 0 — это «не указана». */
  priceLegal?: number;
};

/**
 * Один лот целиком. Возвращает `null`, если лота нет или он снят с продажи —
 * страница тогда отдаёт 404, а не пустую карточку.
 *
 * Названия опций достаём отдельным запросом по справочнику: в строке лота лежат
 * только их идентификаторы.
 */
export async function fetchLot(lotId: number): Promise<LotDetail | null> {
  const rows = (await sql.query(
    `SELECT ${SELECT_COLUMNS},
            l.equipment, l.color_interior, l.description, l.is_foreign,
            l.price_individual_eaeu, l.price_legal, l.min_scenario_price, l.month
     FROM catalog.lots l
     LEFT JOIN catalog.image_prefixes p ON p.id = l.image_prefix_id
     WHERE l.id = $1 AND l.gone_at IS NULL
     LIMIT 1`,
    [lotId],
  )) as (LotRow & {
    equipment: string | null;
    color_interior: string | null;
    description: string | null;
    price_legal: string | number | null;
  })[];

  const row = rows[0];
  if (!row) return null;

  const car: Car = {
    ...toCar(row),
    equipment: row.equipment ?? undefined,
    description: row.description ?? undefined,
  };
  const legal = toNumber(row.price_legal);
  const priceLegal = legal > 0 ? legal : undefined;

  const ids = row.option_ids ?? [];
  if (!ids.length) return { car, options: [], priceLegal };

  const options = (await sql.query(
    `SELECT id, name, group_title AS "group" FROM catalog.options
     WHERE id = ANY($1) ORDER BY group_title NULLS LAST, name`,
    [ids],
  )) as LotOption[];

  return { car, options, priceLegal };
}
