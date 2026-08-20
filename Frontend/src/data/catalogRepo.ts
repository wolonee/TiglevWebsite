import "server-only";

import type { Car } from "./cars";
import { CARCLICK_SOURCE } from "./catalogSource";
import { normalizeCarImages } from "./carImages";
import { serializeFilters, type CatalogFilters } from "@/lib/catalogFilters";

/**
 * Каталог CarClick через бэкенд.
 *
 * Раньше эти запросы шли прямо в Postgres из серверных компонентов. Так было
 * безопасно (в браузер из базы ничего не попадает — код серверный) и на один
 * прыжок быстрее, но структуру таблиц знали два проекта сразу. Теперь владелец
 * данных один: бэкенд.
 *
 * Здесь остаётся только превращение строки базы в `Car` — тип живёт во фронте,
 * и делать его частью контракта бэкенда незачем.
 */

export const PAGE_SIZE = 24;

type LotRow = {
  id: string | number;
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
  volume: number | string | null;
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
  equipment?: string | null;
  description?: string | null;
  price_legal?: string | number | null;
};

const toNumber = (value: string | number | null | undefined): number =>
  value == null ? 0 : typeof value === "number" ? value : Number(value);

/** «3» → «3.0 л». Нулевой объём у электромобилей — не показываем. */
const formatVolume = (volume: number | string | null): string | undefined => {
  const value = volume == null ? null : Number(volume);
  return value == null || !Number.isFinite(value) || value <= 0 ? undefined : `${value.toFixed(1)} л`;
};

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

/**
 * Запрос к бэкенду.
 *
 * Каталог обновляется раз в четыре часа, поэтому ответы кешируются на пять
 * минут: страница фильтра не должна ходить в бэкенд на каждый показ.
 *
 * Ошибку не глотаем. Раньше здесь был молчаливый откат на захардкоженный
 * список машин — сайт продолжал работать, показывая данные полугодовой
 * давности, и понять это можно было только сравнив с админкой.
 */
async function backend<T>(path: string, params?: URLSearchParams): Promise<T> {
  const base = process.env.BACKEND_URL;
  if (!base) throw new Error("BACKEND_URL не задан — каталог берётся из бэкенда");

  const query = params?.toString();
  const response = await fetch(`${base}${path}${query ? `?${query}` : ""}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300, tags: ["catalog"] },
  });
  if (!response.ok) {
    throw new Error(`Бэкенд ответил ${response.status} на ${path}`);
  }
  return (await response.json()) as T;
}

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
  const params = serializeFilters(filters);
  if (cursor != null) params.set("cursor", String(cursor));
  params.set("limit", String(limit));

  const payload = await backend<{ rows: LotRow[]; nextCursor: number | null }>(
    "/api/catalog/lots",
    params,
  );
  return { cars: payload.rows.map(toCar), nextCursor: payload.nextCursor };
}

/** Сколько машин под текущим фильтром — для кнопки «Показать N». */
export async function countCatalog(filters: CatalogFilters): Promise<number> {
  const payload = await backend<{ total: number }>("/api/catalog/count", serializeFilters(filters));
  return payload.total ?? 0;
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
 * Один лот целиком. `null`, если лота нет или он снят с продажи — страница
 * тогда отдаёт 404, а не пустую карточку.
 */
export async function fetchLot(lotId: number): Promise<LotDetail | null> {
  const base = process.env.BACKEND_URL;
  if (!base) throw new Error("BACKEND_URL не задан — каталог берётся из бэкенда");

  const response = await fetch(`${base}/api/catalog/lots/${lotId}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300, tags: ["catalog"] },
  });
  // 404 — это законный ответ «такого лота нет», а не сбой.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Бэкенд ответил ${response.status} на лот ${lotId}`);

  const payload = (await response.json()) as { row: LotRow; options: LotOption[] };
  const car: Car = {
    ...toCar(payload.row),
    equipment: payload.row.equipment ?? undefined,
    description: payload.row.description ?? undefined,
  };
  const legal = toNumber(payload.row.price_legal);
  return { car, options: payload.options ?? [], priceLegal: legal > 0 ? legal : undefined };
}
