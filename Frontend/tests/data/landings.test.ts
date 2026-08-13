import { describe, expect, it } from "vitest";
import seo from "@/data/seo.json";
import { SEGMENT_FILTERS, findLanding, landingFilters, landingPages } from "@/data/landings";

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

  it("страниц столько, сколько насчитал парсер", () => {
    expect(landingPages()).toHaveLength(seo.pageCounts.total);
  });
});
