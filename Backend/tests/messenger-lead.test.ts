import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Уведомление о переходе в мессенджер.
 *
 * Проверяем ровно одно: что бот различает импортный лот и свою машину.
 * Разница не косметическая — по импортной машине администратору нужна ссылка
 * на лот у партнёра, а по своей такой ссылки не существует, и предложить её
 * означало бы отправить человека искать чужой каталог.
 *
 * Заодно закрываем важное свойство: название машины берётся из базы, а не из
 * тела запроса. Текст уходит в Telegram, и присланному в запросе доверять нельзя.
 */

const carRecords = { all: vi.fn(), active: vi.fn(), find: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn(), reorder: vi.fn() };
const customerRequests = { create: vi.fn(), all: vi.fn(), find: vi.fn(), update: vi.fn() };
const broadcastMessengerLead = vi.fn();
const fetchLot = vi.fn();
const recordEvent = vi.fn();

vi.mock("../src/config.js", () => ({ config: {
  BACKEND_API_KEY: "test-api-key", TELEGRAM_WEBHOOK_SECRET: "test-webhook-secret",
  FRONTEND_ORIGIN: "http://localhost:3000", DATABASE_URL: "postgres://test:test@localhost/test",
  CARCLICK_REF_PARAM: "r",
} }));
vi.mock("../src/database.js", () => ({ carRecords, customerRequests, carStatuses: ["draft", "active"] }));
vi.mock("../src/telegram.js", () => ({ bot: {}, broadcastMessengerLead, broadcastSellRequest: vi.fn(), broadcastContactRequest: vi.fn() }));
vi.mock("../src/email.js", () => ({ sendSellRequestEmail: vi.fn(), sendContactRequestEmail: vi.fn() }));
vi.mock("../src/catalog.js", () => ({ fetchLot, PAGE_SIZE: 24, countCatalog: vi.fn(), fetchCatalogPage: vi.fn(), parseFilters: vi.fn() }));
vi.mock("../src/analytics.js", () => ({ recordEvent, rollup: vi.fn(), summary: vi.fn() }));

const { app } = await import("../src/app.js");

/** Живой браузер, а не робот: иначе событие отсеивается до уведомления. */
const BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1";

const send = (body: Record<string, unknown>) =>
  request(app).post("/api/analytics/event").set("User-Agent", BROWSER).send(body).expect(204);

describe("уведомление о переходе в мессенджер", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordEvent.mockResolvedValue({ ok: true });
    broadcastMessengerLead.mockResolvedValue({ recipients: 1, delivered: 1 });
    carRecords.find.mockResolvedValue(null);
    fetchLot.mockResolvedValue(null);
  });

  it("даёт ссылку на лот партнёра для импортной машины", async () => {
    fetchLot.mockResolvedValue({ row: { brand: "MG", model: "MG3", year: 2026, price_individual: 2658854 } });

    await send({ type: "outbound", messenger: "telegram", path: "/catalog/cc-467643",
                 lotId: 467643, carId: "cc-467643", pageUrl: "https://tiglev.com/catalog/cc-467643" });

    expect(broadcastMessengerLead).toHaveBeenCalledWith(expect.objectContaining({
      own: false,
      title: "MG MG3 2026 г.",
      partnerUrl: "https://carclick.ru/marketplace/467643",
    }));
  });

  it("не выдумывает ссылку на партнёра для своей машины", async () => {
    carRecords.find.mockResolvedValue({ id: "kia-sorento-2024", brand: "KIA", model: "Sorento", year: 2024, price: 5850000 });

    await send({ type: "outbound", messenger: "vk", path: "/catalog/kia-sorento-2024",
                 carId: "kia-sorento-2024", pageUrl: "https://tiglev.com/catalog/kia-sorento-2024" });

    expect(fetchLot).not.toHaveBeenCalled();
    const lead = broadcastMessengerLead.mock.calls[0][0];
    expect(lead.own).toBe(true);
    expect(lead.title).toBe("KIA Sorento 2024 г.");
    expect(lead.partnerUrl).toBeUndefined();
  });

  it("берёт название из базы, а не из тела запроса", async () => {
    fetchLot.mockResolvedValue({ row: { brand: "MG", model: "MG3", year: 2026 } });

    await send({ type: "outbound", messenger: "telegram", path: "/catalog/cc-1",
                 lotId: 1, title: "Позвоните по номеру 8-800-МОШЕННИК" });

    expect(broadcastMessengerLead.mock.calls[0][0].title).toBe("MG MG3 2026 г.");
  });

  it("молчит, когда переход не состоялся", async () => {
    await send({ type: "pageview", path: "/" });
    expect(broadcastMessengerLead).not.toHaveBeenCalled();
  });
});
