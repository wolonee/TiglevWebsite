/**
 * Состояние фильтров каталога: разбор из URL, сборка обратно и проверка машины.
 *
 * Фильтры живут в адресной строке (`/?country=kitai&brand=kia&price=3500000-5000000`),
 * иначе не работают «поделиться ссылкой», кнопка «назад» и индексация страниц
 * фильтров поисковиком — см. FILTERS.md.
 *
 * Проверка `matchesFilters` работает на клиенте по загруженной выборке. Когда
 * каталог переедет в Postgres, тот же разбор URL будет собирать SQL с курсором
 * (`WHERE ... AND id < :cursor ORDER BY id DESC LIMIT 100`), а предикат
 * останется для тестов и для своих девяти машин.
 */

import type { Car } from "@/data/cars";
import { canonicalDrive, canonicalWord, CARCLICK_SOURCE, OWN_SOURCE } from "@/data/catalogSource";

/** Ключи, значения которых — список строк через запятую. */
export const MULTI_KEYS = [
  "country",
  "brand",
  "model",
  "body",
  "condition",
  "fuel",
  "transmission",
  "drive",
  "year",
  "color",
  "delivery",
  "avail",
] as const;

export type MultiKey = (typeof MULTI_KEYS)[number];

export type NumericRange = { from: number; to: number | null };

export type CatalogFilters = {
  [K in MultiKey]: string[];
} & {
  price: NumericRange | null;
  mileage: NumericRange | null;
  /** id опций; условие «И» — машина должна иметь все выбранные. */
  opt: number[];
};

export const emptyFilters: CatalogFilters = {
  country: [], brand: [], model: [], body: [], condition: [], fuel: [],
  transmission: [], drive: [], year: [], color: [], delivery: [], avail: [],
  price: null, mileage: null, opt: [],
};

const splitList = (value: string | null): string[] =>
  value ? value.split(",").map((part) => part.trim()).filter(Boolean) : [];

function parseRange(value: string | null): NumericRange | null {
  if (!value) return null;
  const [rawFrom, rawTo] = value.split("-");
  const from = Number(rawFrom);
  if (!Number.isFinite(from)) return null;
  // «12000000-» — открытый верхний край: «от 12 млн».
  const to = rawTo === "" || rawTo === undefined ? null : Number(rawTo);
  return { from, to: to != null && Number.isFinite(to) ? to : null };
}

export function serializeRange(range: NumericRange): string {
  return `${range.from}-${range.to ?? ""}`;
}

export function parseFilters(params: URLSearchParams): CatalogFilters {
  const filters = { ...emptyFilters, opt: [] as number[] };
  for (const key of MULTI_KEYS) filters[key] = splitList(params.get(key));
  filters.price = parseRange(params.get("price"));
  filters.mileage = parseRange(params.get("mileage"));
  filters.opt = splitList(params.get("opt")).map(Number).filter(Number.isFinite);
  return filters;
}

export function serializeFilters(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of MULTI_KEYS) {
    if (filters[key].length) params.set(key, filters[key].join(","));
  }
  if (filters.price) params.set("price", serializeRange(filters.price));
  if (filters.mileage) params.set("mileage", serializeRange(filters.mileage));
  if (filters.opt.length) params.set("opt", filters.opt.join(","));
  return params;
}

export function countActive(filters: CatalogFilters): number {
  let total = MULTI_KEYS.reduce((sum, key) => sum + filters[key].length, 0);
  if (filters.price) total += 1;
  if (filters.mileage) total += 1;
  return total + filters.opt.length;
}

export function isEmpty(filters: CatalogFilters): boolean {
  return countActive(filters) === 0;
}

export function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function inRange(value: number | undefined, range: NumericRange | null): boolean {
  if (!range) return true;
  if (value == null) return false;
  return value >= range.from && (range.to == null || value < range.to);
}

/** Пустой список значений фильтра означает «любое», а не «ничего». */
const matchesAny = (selected: string[], value?: string): boolean =>
  selected.length === 0 || (value != null && selected.includes(value));

export function matchesFilters(car: Car, filters: CatalogFilters): boolean {
  const source = car.source ?? OWN_SOURCE;

  if (filters.avail.length) {
    const key = source === CARCLICK_SOURCE ? "order" : "instock";
    if (!filters.avail.includes(key)) return false;
  }
  if (!matchesAny(filters.country, car.countryCode)) return false;
  if (!matchesAny(filters.brand, car.brandCode)) return false;
  if (!matchesAny(filters.model, car.modelCode)) return false;
  if (!matchesAny(filters.body, car.bodyType || undefined)) return false;
  if (!matchesAny(filters.condition, car.condition)) return false;
  if (!matchesAny(filters.fuel, canonicalWord(car.fuel))) return false;
  if (!matchesAny(filters.transmission, canonicalWord(car.transmission))) return false;
  if (!matchesAny(filters.drive, canonicalDrive(car.drive))) return false;
  if (!matchesAny(filters.year, car.year ? String(car.year) : undefined)) return false;
  if (!matchesAny(filters.color, car.colorHex)) return false;
  if (!matchesAny(filters.delivery, car.deliveryTime != null ? String(car.deliveryTime) : undefined)) {
    return false;
  }
  if (!inRange(car.price, filters.price)) return false;
  if (!inRange(car.mileage, filters.mileage)) return false;

  // Опции — «И»: выбрал ABS и люк, значит нужны обе.
  if (filters.opt.length) {
    if (!car.options?.length) return false;
    const owned = new Set(car.options);
    if (!filters.opt.every((id) => owned.has(id))) return false;
  }
  return true;
}
