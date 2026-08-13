import seo from "./seo.json";
import { emptyFilters, type CatalogFilters } from "@/lib/catalogFilters";

/**
 * Посадочные страницы каталога.
 *
 * В индекс идут они, а не 83 тысячи карточек: карточки дословно повторяют
 * carclick.ru, и массово отдавать их поиску нельзя (см. SEO.md). Здесь 144
 * страницы, у которых есть чего сказать своего — прежде всего сравнение цен
 * на модель по странам, которого нет ни у одного конкурента.
 *
 * Данные считает парсер (`carclick.py --target pg seo`) и кладёт в `seo.json`.
 * Тексты берём готовыми: числа в них посчитаны по базе и должны обновляться
 * вместе с ней, а не жить в вёрстке.
 */

export type LandingType = "country-model" | "country-brand" | "segment";

export type LandingStats = {
  count: number;
  priceMin: number | null;
  priceMax: number | null;
  priceMedian: number | null;
  yearFrom: number | null;
  yearTo: number | null;
  mileageAvg: number | null;
};

export type ComparisonYear = {
  year: number;
  cheapest: string;
  gap: number;
  prices: Record<string, number>;
  lots: Record<string, number>;
};

export type Comparison = {
  brand: string;
  model: string;
  cheapest: string;
  gap: number;
  matchedYears: number;
  agreeingYears: number;
  byYear: ComparisonYear[];
  headline: string;
  /** Формулировка методики — показываем сноской, иначе цифра читается как факт. */
  method: string;
};

export type LandingPage = {
  type: LandingType;
  slug: string;
  title: string;
  h1: string;
  description: string;
  count: number;
  stats: LandingStats;
  /** Готовые параметры каталога. У сегментов их нет — см. `SEGMENT_FILTERS`. */
  filter?: { country?: string; brand?: string; model?: string };
  /** Условие сегмента в терминах SQL — источник правды для `SEGMENT_FILTERS`. */
  sqlCondition?: string;
  comparison?: Comparison;
  topBrands?: { name: string; count: number }[];
  topModels?: { name: string; count: number }[];
};

const PAGES = seo.pages as unknown as LandingPage[];

/**
 * Сегменты описаны в парсере условием SQL (`fuel = 'электро'`), а витрина
 * умеет только фильтры каталога. Перевод держим здесь явной таблицей, а не
 * разбором SQL: разбор молча сломается от любой правки условия, а таблица
 * падает в тесте, который сверяет её с `seo.json`.
 */
export const SEGMENT_FILTERS: Record<string, Partial<CatalogFilters>> = {
  novye: { condition: ["new"] },
  "v-nalichii": { country: ["rossiiskaya-federaciya"] },
  elektromobili: { fuel: ["электро"] },
  gibridy: { fuel: ["гибрид"] },
  vnedorozhniki: { body: ["Внедорожник"] },
  "do-2-mln": { price: { from: 0, to: 2_000_000 } },
  "polnyy-privod": { drive: ["4WD"] },
  "bez-probega": { mileage: { from: 0, to: 30_000 } },
};

export const landingPages = (): LandingPage[] => PAGES;

export const findLanding = (slug: string): LandingPage | undefined =>
  PAGES.find((page) => page.slug === slug);

/** Фильтр каталога для посадочной страницы: одинаково для моделей, марок и сегментов. */
export function landingFilters(page: LandingPage): CatalogFilters {
  if (page.type === "segment") {
    return { ...emptyFilters, opt: [], ...SEGMENT_FILTERS[page.slug] };
  }
  const { country, brand, model } = page.filter ?? {};
  return {
    ...emptyFilters,
    opt: [],
    country: country ? [country] : [],
    brand: brand ? [brand] : [],
    model: model ? [model] : [],
  };
}

/** «kitai» → «Китай». Коды стран приходят из сравнения цен по годам. */
export const COUNTRY_NAMES: Record<string, string> = {
  "yuznaya-koreya": "Южная Корея",
  kitai: "Китай",
  "es-evropa": "Европа",
  "rossiiskaya-federaciya": "Россия",
};

export const countryName = (code: string) => COUNTRY_NAMES[code] ?? code;
