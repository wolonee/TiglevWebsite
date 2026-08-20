import Link from "next/link";
import { landingPages } from "@/data/landings";

/**
 * Ссылки на популярные подборки под лентой каталога.
 *
 * До этого на 144 посадочные страницы не вело ни одной ссылки — они лежали
 * только в карте сайта. Робот такие страницы обходит неохотно, а вес по ним
 * не передаётся вовсе, так что вся работа над ними пропадала впустую.
 *
 * Берём самые крупные подборки каждого вида: по ним и людям есть что выбрать,
 * и робот получает вход в остальные — с каждой подборки дальше идут ссылки
 * на соседние.
 */
const pick = (type: string, limit: number) =>
  landingPages()
    .filter((page) => page.type === type)
    .sort((first, second) => second.count - first.count)
    .slice(0, limit);

const Group = ({ title, pages }: { title: string; pages: ReturnType<typeof pick> }) => (
  <div className="min-w-0">
    <h3 className="text-sm font-bold text-dark">{title}</h3>
    <ul className="mt-3 flex flex-wrap gap-2">
      {pages.map((page) => (
        <li key={page.slug}>
          <Link
            href={`/catalog/${page.slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-border bg-white px-3 py-2 text-sm font-semibold text-dark transition-colors hover:border-gray-text/40"
          >
            {page.h1}
            <span className="text-xs font-medium text-gray-text tabular-nums">
              {page.count.toLocaleString("ru-RU")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export default function PopularLandings() {
  return (
    <section className="section-space">
      <div className="shell">
        <h2 className="text-2xl font-extrabold tracking-tight text-dark">Популярные подборки</h2>
        <p className="mt-2 max-w-2xl text-sm text-gray-text">
          Готовые выборки по стране, марке и типу машины — с ценами и сравнением,
          откуда конкретную модель выгоднее везти.
        </p>
        <div className="mt-6 space-y-7">
          <Group title="По типу" pages={pick("segment", 8)} />
          <Group title="Марки по странам" pages={pick("country-brand", 10)} />
          <Group title="Модели по странам" pages={pick("country-model", 10)} />
        </div>
      </div>
    </section>
  );
}
