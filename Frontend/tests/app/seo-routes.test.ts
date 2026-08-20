import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("robots.txt", () => {
  it("закрывает адреса с фильтрами и админку, но не сам каталог", async () => {
    const { default: robots } = await import("@/app/robots");
    const rule = robots().rules;
    const disallow = (Array.isArray(rule) ? rule[0] : rule).disallow as string[];

    // `/*?` — любой адрес с параметрами: `?brand=kia&price=…&opt=50`.
    expect(disallow).toContain("/*?");
    expect(disallow).toContain("/admin");
    expect(disallow).not.toContain("/");
  });

  it("указывает карту сайта", async () => {
    const { default: robots } = await import("@/app/robots");
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
  });
});

describe("sitemap.xml", () => {
  it("отдаёт все посадочные страницы и не отдаёт импортные карточки", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const { landingPages } = await import("@/data/landings");
    const urls = (await sitemap()).map((entry) => entry.url);

    const missing = landingPages()
      .map((page) => page.slug)
      .filter((slug) => !urls.some((url) => url.endsWith(`/catalog/${slug}`)));
    expect(missing).toEqual([]);
    // Лоты CarClick — дубликат carclick.ru, вести к ним робота нельзя.
    expect(urls.filter((url) => url.includes("/catalog/cc-"))).toEqual([]);
  });

  it("включает главную и свои машины", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls.some((url) => url.endsWith("/"))).toBe(true);
    expect(urls.some((url) => url.includes("/catalog/kia-sorento-2017"))).toBe(true);
  });
});
