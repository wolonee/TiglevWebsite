import facets from "@/data/facets.json";

/**
 * Адреса и заголовки для поиска.
 *
 * `canonical` нужен из-за фильтров: `?brand=kia`, `?brand=kia&price=…`,
 * `?brand=kia&price=…&opt=50` — для робота это разные страницы с почти одинаковым
 * содержимым. Без канонической ссылки вес размазывается по мусорным адресам,
 * а каталог тонет в дублях раньше, чем робот дойдёт до полезного (см. SEO.md).
 */

/**
 * Домен для абсолютных ссылок. Задаётся переменной окружения — на превью-деплоях
 * Vercel адрес другой, и canonical оттуда не должен указывать на прод.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://tiglev.com";

export const SITE_NAME = "TIGLEV.COM";

/** «Заголовок страницы — TIGLEV.COM». Шаблона в layout нет: старые страницы дописывают имя сами. */
export const pageTitle = (title: string) => `${title} — ${SITE_NAME}`;

/**
 * Размер каталога для описаний. Берём из `facets.json`, который пересобирает
 * парсер: число в описании не должно устаревать вместе с кодом.
 */
export const CATALOG_SIZE = Math.floor((facets.totalLots ?? 0) / 1000) * 1000;

type FacetValue = { value: string; label: string; count: number };

const facetValues = (key: string): FacetValue[] =>
  [...(facets.basic ?? []), ...(facets.advanced ?? [])]
    .find((facet) => facet.key === key)
    ?.values ?? [];

/**
 * Цифры для первого экрана — из данных, а не написанные руками.
 *
 * Каталог живой: каждая цифра в вёрстке устаревает к следующему обходу.
 * Здесь берём то, что пересобирает парсер, и округляем — точность до машины
 * на первом экране никому не нужна, а «83 402» через неделю станет неправдой.
 */
export function catalogFacts(): { value: string; label: string }[] {
  const round = (count: number) => `${(Math.floor(count / 1000) * 1000).toLocaleString("ru-RU")}+`;
  const countries = facetValues("country").filter((item) => item.value !== "rossiiskaya-federaciya");
  const fresh = facetValues("condition").find((item) => item.value === "new");

  return [
    { value: round(CATALOG_SIZE), label: "автомобилей в каталоге" },
    { value: String(countries.length), label: "страны под заказ" },
    ...(fresh ? [{ value: round(fresh.count), label: "новых, без пробега" }] : []),
  ];
}

/**
 * Страна в родительном падеже: «из Китая», а не «из Китай».
 *
 * В базе названия лежат в именительном, и подстановка их в заголовок давала бы
 * безграмотную строку в десятках тысяч заголовков сразу. Стран в каталоге
 * четыре, так что список, а не правила склонения. Незнакомую страну
 * подставляем как есть — лучше именительный падеж, чем выдуманное окончание.
 */
const COUNTRY_GENITIVE: Record<string, string> = {
  // «Южная Корея» намеренно сворачивается до «Кореи». Проверено по подсказкам
  // Яндекса: «авто из южной кореи» тянет за собой сканворды («3 буквы»),
  // а «авто из кореи» — только коммерческие запросы. Это заголовки 41 911
  // страниц, так что разница не косметическая.
  "Южная Корея": "Кореи",
  Корея: "Кореи",
  Китай: "Китая",
  Европа: "Европы",
  Германия: "Германии",
  Япония: "Японии",
  "Россия (в наличии)": "России",
  Россия: "России",
};

export const fromCountry = (country?: string): string => {
  if (!country) return "";
  return `из ${COUNTRY_GENITIVE[country.trim()] ?? country.trim()} `;
};
