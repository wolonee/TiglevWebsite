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

export type LandingType = "country-model" | "country-brand" | "segment" | "city";

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
  // Верхняя граница диапазона исключающая, поэтому 161: «до 160 л.с.»
  // в запросе значит «160 включительно» — это налоговый порог.
  "do-160-ls": { hp: { from: 0, to: 161 } },
  // Городская страница: машины те же корейские, отличается только текст.
  "avto-iz-korei-tolyatti": { country: ["yuznaya-koreya"] },
};

export const landingPages = (): LandingPage[] => PAGES;

export const findLanding = (slug: string): LandingPage | undefined =>
  PAGES.find((page) => page.slug === slug);

/** Фильтр каталога для посадочной страницы: одинаково для моделей, марок и сегментов. */
export function landingFilters(page: LandingPage): CatalogFilters {
  if (page.type === "segment" || page.type === "city") {
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

/**
 * Показывать ли на этой странице блок сравнения цен.
 *
 * Сравнение считается для пары «марка + модель» и потому приезжает во все
 * страны, где эта модель есть. Если рисовать его везде, один и тот же текст
 * («BMW 5 Series из Китая дешевле примерно на 523 513 ₽») стоит и на странице
 * Кореи, и на странице Китая — мы делаем себе дубли в проекте, затеянном
 * ради ухода от дублей.
 *
 * Оставляем блок стране-победителю: там он читается как довод за эту страницу.
 * У проигравшей он всё равно продавал бы соседнюю.
 *
 * Но только если у победителя вообще есть страница. Простое правило «показывать
 * лишь победителю» отняло блок у 15 страниц из 26, и у восьми моделей он исчезал
 * совсем: победитель не набрал 200 машин и своей страницы не получил. Лучше
 * «из Китая дешевле» на корейской странице, где сравнить не с чем, чем ничего.
 */
export function pageComparison(page: LandingPage): Comparison | undefined {
  if (!page.comparison) return undefined;
  if (page.type !== "country-model") return page.comparison;
  if (page.filter?.country === page.comparison.cheapest) return page.comparison;

  const winnerHasPage = PAGES.some(
    (item) =>
      item.type === "country-model" &&
      item.filter?.brand === page.filter?.brand &&
      item.filter?.model === page.filter?.model &&
      item.filter?.country === page.comparison!.cheapest,
  );
  return winnerHasPage ? undefined : page.comparison;
}

/** Ссылки на соседние подборки: у марок это модели, у сегментов — марки. */
export type RelatedLink = { name: string; count: number; href: string };

/**
 * Соседние подборки для перелинковки.
 *
 * Две задачи разом. Во-первых, на 118 из 144 страниц нет блока сравнения,
 * и список моделей с числами — единственное, что отличает их друг от друга.
 * Во-вторых, до сих пор на посадочные не вела ни одна ссылка: они лежали
 * только в карте сайта, а такие страницы робот обходит неохотно.
 *
 * Ведём на соседнюю посадочную, если она есть; иначе — на каталог
 * с готовым фильтром.
 */
export function relatedLinks(page: LandingPage): RelatedLink[] {
  if (page.type === "country-brand" && page.topModels?.length) {
    const country = page.filter?.country;
    const brand = page.filter?.brand;
    return page.topModels.slice(0, 8).map(({ name, count }) => {
      const model = PAGES.find(
        (item) =>
          item.type === "country-model" &&
          item.filter?.country === country &&
          item.filter?.brand === brand &&
          item.h1.startsWith(`${page.h1.split(" из ")[0]} ${name}`),
      );
      return {
        name,
        count,
        href: model ? `/catalog/${model.slug}` : `/?country=${country}&brand=${brand}#catalog`,
      };
    });
  }

  if ((page.type === "segment" || page.type === "city") && page.topBrands?.length) {
    return page.topBrands.slice(0, 8).map(({ name, count }) => {
      const brandPage = PAGES.find((item) => item.type === "country-brand" && item.h1.startsWith(`${name} из `));
      return { name, count, href: brandPage ? `/catalog/${brandPage.slug}` : "/#catalog" };
    });
  }

  return [];
}

/** «kitai» → «Китай». Коды стран приходят из сравнения цен по годам. */
export const COUNTRY_NAMES: Record<string, string> = {
  "yuznaya-koreya": "Южная Корея",
  kitai: "Китай",
  "es-evropa": "Европа",
  "rossiiskaya-federaciya": "Россия",
};

export const countryName = (code: string) => COUNTRY_NAMES[code] ?? code;
