import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, TrendingDown } from "lucide-react";
import SitePage from "@/components/SitePage";
import CatalogGrid from "@/components/CatalogGrid";
import { formatPrice } from "@/data/cars";
import { parseFilters } from "@/lib/catalogFilters";
import { countCatalog, fetchCatalogPage } from "@/data/catalogRepo";
import {
  countryName,
  landingFilters,
  pageComparison,
  relatedLinks,
  type LandingPage,
} from "@/data/landings";

/**
 * Посадочная страница каталога: «KIA Carnival из Кореи», «Электромобили под заказ».
 *
 * Их 144, и именно они идут в индекс вместо 83 тысяч карточек. Уникальность
 * даёт блок сравнения цен по странам: таких данных нет ни у carclick, ни у avito,
 * потому что никто больше не свёл три страны в одну базу.
 *
 * Ниже блока — обычная лента каталога с предустановленным фильтром. Никакого
 * отдельного запроса: тот же `fetchCatalogPage`, что и на главной.
 */

export const landingMetadata = (page: LandingPage): Metadata => ({
  title: page.title,
  description: page.description,
  alternates: { canonical: `/catalog/${page.slug}` },
  openGraph: { title: page.title, description: page.description, type: "website", locale: "ru_RU" },
});

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-text">{label}</dt>
    <dd className="mt-0.5 text-[15px] font-semibold text-dark tabular-nums">{value}</dd>
  </div>
);

/**
 * Сравнение цен по странам.
 *
 * «Примерно» и сноска про методику — не вежливость, а необходимость: цифра
 * получена как медиана погодовых разниц, а комплектации внутри одной модели
 * различаются. Публиковать её как точный факт нельзя (см. SEO.md).
 */
const ComparisonBlock = ({ comparison }: { comparison: NonNullable<LandingPage["comparison"]> }) => (
  <section className="rounded-2xl border border-gray-border bg-white p-5 sm:p-7">
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-primary">
        <TrendingDown className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold leading-snug text-dark">{comparison.headline}</h2>
        <p className="mt-1 text-sm text-gray-text">
          Сравнили {comparison.matchedYears} лет выпуска, разница подтверждается в{" "}
          {comparison.agreeingYears} из них.
        </p>
      </div>
    </div>

    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[26rem] text-sm">
        <thead>
          <tr className="border-b border-gray-border text-left text-[11px] font-bold uppercase tracking-wide text-gray-text">
            <th className="py-2 pr-4 font-bold">Год</th>
            {Object.keys(comparison.byYear[0]?.prices ?? {}).map((code) => (
              <th key={code} className="py-2 pr-4 font-bold">{countryName(code)}</th>
            ))}
            <th className="py-2 font-bold">Разница</th>
          </tr>
        </thead>
        <tbody>
          {comparison.byYear.map((row) => (
            <tr key={row.year} className="border-b border-gray-border last:border-0">
              <td className="py-2.5 pr-4 font-semibold text-dark tabular-nums">{row.year}</td>
              {Object.entries(row.prices).map(([code, price]) => (
                <td
                  key={code}
                  className={`py-2.5 pr-4 tabular-nums ${
                    code === row.cheapest ? "font-semibold text-dark" : "text-gray-text"
                  }`}
                >
                  {formatPrice(price)}
                  <span className="ml-1 text-xs text-gray-text/70">({row.lots[code]})</span>
                </td>
              ))}
              <td className="py-2.5 font-semibold text-primary tabular-nums">{formatPrice(row.gap)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p className="mt-4 text-xs leading-relaxed text-gray-text">
      {comparison.method} В скобках — сколько машин участвовало в расчёте.
    </p>
  </section>
);

/**
 * Соседние подборки. Это и содержимое, которого больше нигде на странице нет,
 * и единственный путь робота к остальным 143 страницам: до сих пор на них
 * не вела ни одна ссылка.
 */
const RelatedBlock = ({ title, links }: { title: string; links: ReturnType<typeof relatedLinks> }) => (
  <section>
    <h2 className="text-lg font-extrabold text-dark">{title}</h2>
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-border bg-white px-3 py-2 text-sm font-semibold text-dark transition-colors hover:border-gray-text/40"
        >
          {link.name}
          <span className="text-xs font-medium text-gray-text tabular-nums">{link.count}</span>
        </Link>
      ))}
    </div>
  </section>
);

/**
 * Фильтр подборки плюс то, что человек выбрал в панели.
 *
 * Страница читает параметры адреса, поэтому рендерится по запросу, а не
 * собирается заранее. Это осознанный размен: иначе смена фильтра либо уводила
 * бы с посадочной, либо потребовала второго механизма фильтрации на клиенте —
 * а два источника правды о выдаче обязательно разъедутся.
 */
export default async function LandingView({
  page,
  searchParams,
}: {
  page: LandingPage;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === "string") query.set(key, value);
  }
  const base = landingFilters(page);
  // Параметры адреса уже содержат условия подборки: панель отдаёт их целиком.
  const filters = query.size ? { ...base, ...parseFilters(query) } : base;
  const [firstPage, total] = await Promise.all([
    fetchCatalogPage(filters),
    countCatalog(filters),
  ]);

  const facts = [
    page.stats.priceMin && page.stats.priceMax
      ? { label: "Цены", value: `${formatPrice(page.stats.priceMin)} — ${formatPrice(page.stats.priceMax)}` }
      : null,
    page.stats.priceMedian ? { label: "Медиана", value: formatPrice(page.stats.priceMedian) } : null,
    page.stats.yearFrom && page.stats.yearTo
      ? { label: "Годы выпуска", value: `${page.stats.yearFrom} — ${page.stats.yearTo}` }
      : null,
    page.stats.mileageAvg
      ? { label: "Средний пробег", value: `${page.stats.mileageAvg.toLocaleString("ru-RU")} км` }
      : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);

  const comparison = pageComparison(page);
  const related = relatedLinks(page);

  return (
    <SitePage>
      <section className="section-space pb-8 pt-24 sm:pt-28">
        <div className="shell space-y-6">
          <Link href="/#catalog" className="inline-flex items-center gap-2 text-sm text-gray-text hover:text-primary">
            <ArrowLeft size={16} />
            Весь каталог
          </Link>

          <div>
            <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight text-dark sm:text-4xl">
              {page.h1}
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-gray-text">{page.description}</p>
          </div>

          {facts.length ? (
            <dl className="grid gap-5 rounded-2xl border border-gray-border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
              {facts.map((fact) => (
                <Fact key={fact.label} {...fact} />
              ))}
            </dl>
          ) : null}

          {comparison ? <ComparisonBlock comparison={comparison} /> : null}

          {related.length ? (
            <RelatedBlock
              title={page.type === "country-brand" ? "Модели этой марки" : "Марки в этой подборке"}
              links={related}
            />
          ) : null}
        </div>
      </section>

      <CatalogGrid
        initialCars={firstPage.cars}
        initialCursor={firstPage.nextCursor}
        total={total}
        initialFilters={filters}
        heading={{ eyebrow: "Подборка", title: page.h1 }}
        basePath={`/catalog/${page.slug}`}
        baseFilters={base}
      />
    </SitePage>
  );
}
