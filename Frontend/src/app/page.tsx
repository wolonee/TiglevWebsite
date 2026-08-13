import type { Metadata } from "next";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CatalogGrid from "@/components/CatalogGrid";
import Footer from "@/components/Footer";
import { getCatalogCars } from "@/data/cars";
import { countCatalog, fetchCatalogPage } from "@/data/catalogRepo";
import { OWN_SOURCE } from "@/data/catalogSource";
import { matchesFilters, parseFilters } from "@/lib/catalogFilters";
import { CATALOG_SIZE, pageTitle } from "@/lib/seo";

// Каталог живой: 600–700 новых машин в сутки. Пятнадцати минут достаточно,
// чтобы страница не ходила в базу на каждый заход и не показывала вчерашние цены.
export const revalidate = 900;

/**
 * Заголовок и описание не зависят от фильтров, а `canonical` всегда указывает
 * на чистый «/».
 *
 * Это главное здесь. Каждое сочетание фильтров даёт свой адрес
 * (`?brand=kia&price=…&opt=50`), и таких адресов бесконечно много при почти
 * одинаковом содержимом. Каноническая ссылка сводит их к одной странице, иначе
 * робот тратит обход на дубли. Отдельные заголовки появятся у посадочных
 * страниц из `seo.json` — там содержимое действительно разное (SEO.md, шаг 6).
 */
export const metadata: Metadata = {
  title: pageTitle("Каталог автомобилей в наличии и под заказ"),
  description:
    `Более ${CATALOG_SIZE.toLocaleString("ru-RU")} автомобилей под заказ из Кореи, Китая и Европы ` +
    "и машины в наличии в Тольятти. Цена под ключ, сроки доставки, подбор по марке, году, пробегу и комплектации.",
  alternates: { canonical: "/" },
};

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const HomePage = async ({ searchParams }: HomePageProps) => {
  // Фильтры разбираются на сервере: первый HTML уже отфильтрован, поэтому
  // страницы фильтров попадают в поиск, а человек не видит вспышку чужих карточек.
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const filters = parseFilters(params);

  // «Наличие» — не колонка в базе, а наше деление на два источника. Поэтому
  // фильтр решает, к какому источнику вообще обращаться: при «в наличии»
  // каталог CarClick не запрашиваем совсем, при «под заказ» — не берём своих.
  const wantsOwn = !filters.avail.length || filters.avail.includes("instock");
  const wantsCarclick = !filters.avail.length || filters.avail.includes("order");

  const [ownCars, page, carclickTotal] = await Promise.all([
    wantsOwn ? getCatalogCars() : Promise.resolve([]),
    wantsCarclick ? fetchCatalogPage(filters) : Promise.resolve({ cars: [], nextCursor: null }),
    wantsCarclick ? countCatalog(filters) : Promise.resolve(0),
  ]);

  // Своих машин девять — их отбираем в памяти и ставим первыми: они в наличии
  // в Тольятти, и это сильное предложение на фоне заказа из-за рубежа.
  const own = ownCars
    .map((car) => ({ ...car, source: car.source ?? OWN_SOURCE }))
    .filter((car) => matchesFilters(car, filters));

  return (
    <>
      <Header />
      <main>
        <Hero />
        {/*
          Блока «Свяжитесь с нами» здесь больше нет. Под бесконечной лентой он
          мелькал при быстрой прокрутке: человек листает каталог, а снизу
          проскакивает форма. Связаться можно из шапки, из подвала и со
          страницы /contacts — точек касания достаточно.
        */}
        <CatalogGrid
          initialCars={[...own, ...page.cars]}
          initialCursor={page.nextCursor}
          total={own.length + carclickTotal}
          initialFilters={filters}
        />
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
