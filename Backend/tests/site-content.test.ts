import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Тексты сайта, которые правит администратор.
 *
 * Проверяем то, что делает эту форму опасной: адреса ссылок попадают в меню на
 * каждой странице сайта. `javascript:` в пункте меню выполнялся бы у каждого
 * посетителя, поэтому схема ссылки — не косметическое ограничение.
 */

const siteContent = { get: vi.fn(), save: vi.fn(), history: vi.fn() };

vi.mock("../src/config.js", () => ({ config: {
  BACKEND_API_KEY: "test-api-key", TELEGRAM_WEBHOOK_SECRET: "test-webhook-secret",
  FRONTEND_ORIGIN: "http://localhost:3000", DATABASE_URL: "postgres://test:test@localhost/test",
} }));
vi.mock("../src/database.js", () => ({
  carRecords: { all: vi.fn(), active: vi.fn(), find: vi.fn() },
  customerRequests: { create: vi.fn(), all: vi.fn(), find: vi.fn(), update: vi.fn() },
  carStatuses: ["draft", "active"],
}));
vi.mock("../src/telegram.js", () => ({ bot: {}, broadcastMessengerLead: vi.fn(), broadcastSellRequest: vi.fn(), broadcastContactRequest: vi.fn() }));
vi.mock("../src/email.js", () => ({ sendSellRequestEmail: vi.fn(), sendContactRequestEmail: vi.fn() }));
vi.mock("../src/catalog.js", () => ({ fetchLot: vi.fn(), PAGE_SIZE: 24, countCatalog: vi.fn(), fetchCatalogPage: vi.fn(), parseFilters: vi.fn() }));
vi.mock("../src/analytics.js", () => ({ recordEvent: vi.fn(), rollup: vi.fn(), summary: vi.fn() }));
vi.mock("../src/messengers.js", () => ({ messengerChannels: { all: vi.fn(), enabled: vi.fn(), replace: vi.fn() } }));
vi.mock("../src/content.js", () => ({ siteContent }));

const { app } = await import("../src/app.js");

const VALID = {
  header: {
    nav: [{ href: "/", label: "Главная" }, { href: "/#catalog", label: "Каталог" }],
    ctaLabel: "Написать нам",
    ctaHref: "/contacts",
  },
  hero: {
    badge: "Тольятти — с 2009 года",
    titleLead: "Авто под заказ",
    titleAccent: "из Кореи, Китая и Европы",
    description: "{catalogSize} предложений трёх стран в одном каталоге.",
    stats: [],
  },
  company: {
    name: "TIGLEV.COM",
    about: "Автосалон в Тольятти.",
    address: "гор. Тольятти, ул. Офицерская, 46",
    phones: [{ label: "8 (800) 500-00-15", href: "tel:88005000015" }],
    email: { label: "tiglev2013@yandex.ru", href: "mailto:tiglev2013@yandex.ru" },
    workHours: ["Будние дни: 9:00 — 18:00"],
    vkUrl: "https://vk.com/tiglev",
  },
  footer: { sections: [{ title: "Навигация", links: [{ href: "/contacts", label: "Контакты" }] }] },
};

const put = (content: unknown) =>
  request(app).put("/api/admin/content").set("x-api-key", "test-api-key").send({ content });

describe("тексты сайта", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    siteContent.get.mockResolvedValue(null);
    siteContent.history.mockResolvedValue([]);
    siteContent.save.mockImplementation(async (value) => value);
  });

  it("отдаёт сайту сохранённый документ без ключа", async () => {
    siteContent.get.mockResolvedValue(VALID);
    const response = await request(app).get("/api/content").expect(200);
    expect(response.body.content.hero.titleLead).toBe("Авто под заказ");
  });

  it("отвечает пустотой, пока администратор ничего не менял", async () => {
    const response = await request(app).get("/api/content").expect(200);
    // Сайт в этом случае показывает тексты из кода, а не пустые заголовки.
    expect(response.body.content).toBeNull();
  });

  it("не пускает к правке без ключа", async () => {
    await request(app).put("/api/admin/content").send({ content: VALID }).expect(401);
    expect(siteContent.save).not.toHaveBeenCalled();
  });

  it("сохраняет корректный документ", async () => {
    await put(VALID).expect(200);
    expect(siteContent.save).toHaveBeenCalledOnce();
  });

  it("отклоняет javascript: в пункте меню", async () => {
    await put({ ...VALID, header: { ...VALID.header, nav: [{ href: "javascript:alert(1)", label: "Главная" }] } }).expect(400);
    expect(siteContent.save).not.toHaveBeenCalled();
  });

  it("отклоняет http: — сайт работает по https", async () => {
    await put({ ...VALID, company: { ...VALID.company, vkUrl: "http://vk.com/tiglev" } }).expect(400);
    expect(siteContent.save).not.toHaveBeenCalled();
  });

  it("не принимает документ без обязательного раздела", async () => {
    const { hero, ...withoutHero } = VALID;
    void hero;
    const response = await put(withoutHero).expect(400);
    expect(response.body.error).toContain("hero");
    expect(siteContent.save).not.toHaveBeenCalled();
  });

  it("не даёт стереть заголовок первого экрана в пустоту", async () => {
    await put({ ...VALID, hero: { ...VALID.hero, titleLead: "" } }).expect(400);
    expect(siteContent.save).not.toHaveBeenCalled();
  });
});
