import type { MetadataRoute } from "next";
import { getCatalogCars } from "@/data/cars";
import { landingPages } from "@/data/landings";
import seo from "@/data/seo.json";
import { SITE_URL } from "@/lib/seo";

/**
 * Карта сайта: 144 посадочные страницы плюс статика.
 *
 * Импортных карточек здесь нет намеренно. Их 83 тысячи, и текст у них дословно
 * совпадает с carclick.ru — привести робота к дубликатам значит потратить бюджет
 * обхода и получить низкую оценку качества на весь сайт (см. SEO.md).
 *
 * Свои девять машин — исключение, и оно осознанное: у них собственные фотографии
 * и собственное описание, дубликатом они не являются. Это единственные карточки
 * товара, которые в карте есть.
 */
export const revalidate = 86_400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => `${SITE_URL}${path}`;
  // Дата пересборки данных: у посадочных страниц содержимое меняется вместе
  // с каталогом, а не с кодом.
  const generatedAt = new Date(seo.generatedAt ?? Date.now());

  const staticPages: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: generatedAt, changeFrequency: "daily", priority: 1 },
    { url: url("/sell"), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/contacts"), changeFrequency: "monthly", priority: 0.5 },
  ];

  const landings: MetadataRoute.Sitemap = landingPages().map((page) => ({
    url: url(`/catalog/${page.slug}`),
    lastModified: generatedAt,
    changeFrequency: "weekly",
    // Страницы со сравнением цен по странам — то, ради чего всё затевалось.
    priority: page.comparison ? 0.9 : 0.7,
  }));

  const ownCars: MetadataRoute.Sitemap = (await getCatalogCars()).map((car) => ({
    url: url(`/catalog/${car.id}`),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...landings, ...ownCars];
}
