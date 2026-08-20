"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Car } from "@/data/cars";
import {
  countActive,
  emptyFilters,
  serializeFilters,
  type CatalogFilters,
} from "@/lib/catalogFilters";
import CarCard from "./CarCard";
import FilterPanel from "./filters/FilterPanel";
import SectionHeading from "./SectionHeading";

type CatalogGridProps = {
  /** Первая страница: свои машины плюс начало каталога. Отдаётся сервером. */
  initialCars: Car[];
  /** id последней карточки; с ним лента просит продолжение. */
  initialCursor: number | null;
  /** Сколько всего машин под фильтром — цифра в заголовке и на кнопке. */
  total: number;
  initialFilters: CatalogFilters;
  /**
   * Заголовок ленты. На посадочной странице он свой («KIA Carnival из Кореи»),
   * и заголовок страницы там уже стоит выше — поэтому его можно убрать совсем.
   */
  heading?: { eyebrow: string; title: string } | null;
  /**
   * Адрес посадочной страницы. Пока её собственный фильтр не снят, менять
   * фильтры нужно, не уходя со страницы.
   */
  basePath?: string;
  /** Фильтр самой посадочной: страна, марка, модель или условие сегмента. */
  baseFilters?: CatalogFilters;
};

/**
 * Остались ли в фильтре все условия посадочной страницы.
 *
 * Раньше любое движение фильтра уводило на `/?…`: человек читал «Hyundai
 * Elantra из Кореи» со сравнением цен, нажимал «Под заказ» — и оказывался
 * в общем каталоге без заголовка и без сравнения. Пока подборка не нарушена,
 * остаёмся на её адресе; снял марку — ушёл в общий каталог, и это честно.
 */
const keepsBase = (next: CatalogFilters, base?: CatalogFilters): boolean => {
  if (!base) return false;
  const lists = ["country", "brand", "model", "body", "condition", "fuel", "drive"] as const;
  const sameLists = lists.every((key) => base[key].every((value) => next[key].includes(value)));
  const sameRange = (a: CatalogFilters["price"], b: CatalogFilters["price"]) =>
    a == null || (b != null && b.from === a.from && b.to === a.to);
  return sameLists && sameRange(base.price, next.price) && sameRange(base.mileage, next.mileage);
};

const plural = (count: number) => {
  const tail = count % 100;
  if (tail > 10 && tail < 20) return "автомобилей";
  switch (count % 10) {
    case 1: return "автомобиль";
    case 2:
    case 3:
    case 4: return "автомобиля";
    default: return "автомобилей";
  }
};

/**
 * Каталог на 83 тысячи машин.
 *
 * Фильтрация серверная: столько карточек в браузер не отдают. Смена фильтра
 * меняет адрес, страница пересобирается на сервере — заодно работают «назад»,
 * «поделиться ссылкой» и индексация страниц фильтров.
 *
 * Лента листается курсором, а не OFFSET: каталог живой, и при OFFSET на
 * середине ленты появлялись бы дубли и пропуски.
 */
export default function CatalogGrid({
  initialCars,
  initialCursor,
  total,
  initialFilters,
  heading = { eyebrow: "Каталог", title: "Автомобили в наличии и под заказ" },
  basePath,
  baseFilters,
}: CatalogGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [cars, setCars] = useState(initialCars);
  const [cursor, setCursor] = useState(initialCursor);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // Сервер прислал новую выдачу (сменили фильтр или нажали «назад») —
  // лента начинается заново.
  useEffect(() => {
    setCars(initialCars);
    setCursor(initialCursor);
  }, [initialCars, initialCursor]);

  const applyFilters = useCallback(
    (next: CatalogFilters) => {
      const query = serializeFilters(next).toString();
      const stays = basePath && keepsBase(next, baseFilters);
      const target = stays
        ? `${basePath}${query ? `?${query}` : ""}#catalog`
        : query
          ? `/?${query}#catalog`
          : "/#catalog";
      startTransition(() => router.replace(target, { scroll: false }));
    },
    [router, basePath, baseFilters],
  );

  const loadMore = useCallback(async () => {
    if (cursor == null || isLoadingMore) return;
    setLoadingMore(true);
    try {
      const query = serializeFilters(initialFilters);
      query.set("cursor", String(cursor));
      const response = await fetch(`/api/catalog?${query}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const page = (await response.json()) as { cars: Car[]; nextCursor: number | null };
      setCars((shown) => [...shown, ...page.cars]);
      setCursor(page.nextCursor);
    } catch (error) {
      console.error("Не удалось догрузить каталог:", error);
      // Курсор не трогаем: следующая попытка повторит тот же запрос.
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, isLoadingMore, initialFilters]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || cursor == null) return;
    // Запас в две с лишним высоты карточки: при быстрой прокрутке человек
    // обгонял догрузку и упирался в конец списка. Чем раньше начинается
    // запрос, тем реже видно «дно».
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) void loadMore(); },
      { rootMargin: "1400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  const active = countActive(initialFilters);

  return (
    <section id="catalog" className="section-space bg-gray-bg">
      <div className="shell">
        {heading ? (
          <div className="mb-5 sm:mb-8">
            <SectionHeading
              eyebrow={heading.eyebrow}
              title={heading.title}
              description={`${total.toLocaleString("ru-RU")} ${plural(total)}`}
              align="left"
            />
          </div>
        ) : null}

        <FilterPanel filters={initialFilters} onChange={applyFilters} resultCount={total} />

        <div className="catalog-results" data-updating={isPending}>
          {cars.length ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
                {cars.map((car, index) => (
                  <CarCard key={car.id} car={car} preloadCover={index < 3} />
                ))}
              </div>
              <div ref={sentinel} className="h-1" />
              {cursor != null ? (
                <>
                  <p className="mt-8 text-center text-sm text-gray-text">Загружаем ещё автомобили…</p>
                  {/*
                    Запас пустоты под лентой. При быстрой прокрутке человек
                    обгоняет догрузку, и раньше снизу выскакивал подвал — конец
                    сайта посреди каталога из 83 тысяч машин читается как ошибка.
                    Запас держим только пока есть что грузить: на последней
                    странице подвал должен идти сразу за карточками.
                  */}
                  <div aria-hidden className="h-[45vh]" />
                </>
              ) : null}
            </>
          ) : (
            <div className="rounded-[20px] border border-gray-border bg-white px-5 py-16 text-center">
              <h3 className="text-xl font-bold text-dark">Автомобили не найдены</h3>
              <p className="mt-2 text-sm text-gray-text">
                {active > 0 ? "Попробуйте снять часть фильтров" : "Попробуйте изменить параметры поиска"}
              </p>
              {active > 0 ? (
                <button
                  type="button"
                  onClick={() => applyFilters({ ...emptyFilters, opt: [] })}
                  className="mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                >
                  Сбросить фильтры
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
