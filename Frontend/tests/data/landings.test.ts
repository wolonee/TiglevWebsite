import { describe, expect, it } from "vitest";
import seo from "@/data/seo.json";
import type { Car } from "@/data/cars";
import { matchesFilters } from "@/lib/catalogFilters";
import {
  SEGMENT_FILTERS,
  findLanding,
  landingFilters,
  landingPages,
  pageComparison,
  relatedLinks,
} from "@/data/landings";

const CAR: Car = {
  id: "cc-1", source: "carclick", brand: "KIA", model: "Rio", year: 2022,
  price: 2_000_000, image: "", bodyType: "Седан", engine: "бензин",
};

describe("посадочные страницы", () => {
  it("у каждого сегмента есть перевод условия SQL в фильтр каталога", () => {
    // Условия сегментов задаёт парсер. Добавят девятый — тест упадёт здесь,
    // а не молча покажет посетителю весь каталог вместо электромобилей.
    const segments = landingPages().filter((page) => page.type === "segment");

    expect(segments.length).toBeGreaterThan(0);
    for (const segment of segments) {
      expect(SEGMENT_FILTERS[segment.slug], `нет фильтра для «${segment.slug}»`).toBeDefined();
    }
  });

  it("страница «страна + модель» превращается в фильтр каталога", () => {
    const page = landingPages().find((item) => item.type === "country-model" && item.filter?.model);
    const filters = landingFilters(page!);

    expect(filters.country).toEqual([page!.filter!.country]);
    expect(filters.brand).toEqual([page!.filter!.brand]);
    expect(filters.model).toEqual([page!.filter!.model]);
  });

  it("сегмент «до 2 млн» ограничивает цену, а не марку", () => {
    const filters = landingFilters(findLanding("do-2-mln")!);

    expect(filters.price).toEqual({ from: 0, to: 2_000_000 });
    expect(filters.brand).toEqual([]);
  });

  it("«до 160 л.с.» включает ровно 160: это налоговый порог, а не 159", () => {
    // Верхняя граница диапазона исключающая, поэтому в фильтре 161.
    // Ошибка здесь стоила бы страницы: часть машин выпала бы из подборки.
    const filters = landingFilters(findLanding("do-160-ls")!);

    expect(filters.hp).toEqual({ from: 0, to: 161 });
    expect(matchesFilters({ ...CAR, power: "160" }, filters)).toBe(true);
    expect(matchesFilters({ ...CAR, power: "161" }, filters)).toBe(false);
  });

  it("городская страница фильтрует по Корее, а не по городу", () => {
    // Города в данных нет и быть не может: машины едут из-за границы.
    // Страница отличается только текстом.
    const page = findLanding("avto-iz-korei-tolyatti")!;

    expect(page.type).toBe("city");
    expect(landingFilters(page).country).toEqual(["yuznaya-koreya"]);
  });

  it("слаги уникальны — иначе два адреса ведут на одну страницу", () => {
    const slugs = landingPages().map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("числительные согласованы: «2994 автомобиля», а не «2994 автомобилей»", () => {
    // Генератор долго писал одну форму на все числа, и это было видно
    // прямо в выдаче поиска.
    const wrong = landingPages().filter((page) =>
      /\b\d*[2-4] (автомобилей|предложений)\b/.test(`${page.title} ${page.description}`) &&
      !/\b1[1-4] (автомобилей|предложений)\b/.test(`${page.title} ${page.description}`),
    );

    expect(wrong.map((page) => page.title)).toEqual([]);
  });

  it("блок сравнения стоит только у страны-победителя", () => {
    // Сравнение считается для пары «марка + модель» и приезжает во все страны,
    // где модель есть. Если рисовать везде, один текст стоит на двух наших же
    // страницах — дубли в проекте, затеянном ради ухода от дублей.
    const shown = landingPages().filter((page) => pageComparison(page));
    const byModel = new Map<string, number>();
    for (const page of shown) {
      const key = `${page.filter?.brand}/${page.filter?.model}`;
      byModel.set(key, (byModel.get(key) ?? 0) + 1);
    }

    expect([...byModel.entries()].filter(([, count]) => count > 1)).toEqual([]);

    // Блок снимается только там, где у страны-победителя есть своя страница.
    // Иначе он исчезал бы совсем: победитель не всегда набирает 200 машин.
    for (const page of shown) {
      if (page.filter?.country === page.comparison!.cheapest) continue;
      const winnerHasPage = landingPages().some(
        (item) =>
          item.type === "country-model" &&
          item.filter?.brand === page.filter?.brand &&
          item.filter?.model === page.filter?.model &&
          item.filter?.country === page.comparison!.cheapest,
      );
      expect(winnerHasPage, `${page.slug} показывает чужую победу`).toBe(false);
    }

    // Данные не должны теряться: почти у каждой модели со сравнением блок где-то есть.
    const models = new Set(landingPages().filter((page) => page.comparison).map((page) => `${page.filter?.brand}/${page.filter?.model}`));
    expect(byModel.size).toBe(models.size);
  });

  it("страница марки ведёт на свои модели, а не в пустоту", () => {
    const brandPage = landingPages().find((page) => page.type === "country-brand" && page.topModels?.length);
    const links = relatedLinks(brandPage!);

    expect(links.length).toBeGreaterThan(0);
    // Перелинковка — единственный путь робота к остальным подборкам.
    expect(links.every((link) => link.href.startsWith("/catalog/") || link.href.startsWith("/?"))).toBe(true);
    expect(links.some((link) => link.href.startsWith("/catalog/"))).toBe(true);
  });

  it("страниц столько, сколько насчитал парсер", () => {
    expect(landingPages()).toHaveLength(seo.pageCounts.total);
  });
});
