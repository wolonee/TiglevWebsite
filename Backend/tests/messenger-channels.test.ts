import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Каналы связи, которыми администратор управляет из админки.
 *
 * Главное, что проверяем, — ограничения на шаблон ссылки. Он приходит из формы
 * и попадает в `href` на каждой карточке машины, поэтому `javascript:` в этом
 * поле означал бы выполнение чужого кода у каждого посетителя.
 */

const messengerChannels = { all: vi.fn(), enabled: vi.fn(), replace: vi.fn() };

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
vi.mock("../src/messengers.js", () => ({ messengerChannels }));

const { app } = await import("../src/app.js");

const TELEGRAM = {
  id: "telegram", label: "Telegram", handle: "NARCI33IST",
  urlTemplate: "https://t.me/{handle}?text={message}", prefillsMessage: true, enabled: true,
};

const put = (channels: unknown[]) =>
  request(app).put("/api/admin/messengers").set("x-api-key", "test-api-key").send({ channels });

describe("каналы связи", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messengerChannels.all.mockResolvedValue([TELEGRAM]);
    messengerChannels.enabled.mockResolvedValue([TELEGRAM]);
    messengerChannels.replace.mockImplementation(async (channels) => channels);
  });

  it("отдаёт сайту только включённые каналы", async () => {
    const response = await request(app).get("/api/messengers").expect(200);
    expect(messengerChannels.enabled).toHaveBeenCalled();
    expect(response.body.channels).toEqual([TELEGRAM]);
  });

  it("не пускает к настройкам без ключа", async () => {
    await request(app).get("/api/admin/messengers").expect(401);
    await request(app).put("/api/admin/messengers").send({ channels: [] }).expect(401);
    expect(messengerChannels.replace).not.toHaveBeenCalled();
  });

  it("сохраняет список и запоминает порядок кнопок", async () => {
    const vk = { ...TELEGRAM, id: "vk", label: "VK", urlTemplate: "https://vk.me/{handle}", prefillsMessage: false };
    await put([vk, TELEGRAM]).expect(200);

    const saved = messengerChannels.replace.mock.calls[0][0];
    expect(saved.map((channel: { id: string; position: number }) => [channel.id, channel.position]))
      .toEqual([["vk", 0], ["telegram", 1]]);
  });

  it("разрешает пустой список: это осознанное «связи здесь нет»", async () => {
    await put([]).expect(200);
    expect(messengerChannels.replace).toHaveBeenCalledWith([]);
  });

  it("отклоняет javascript: в шаблоне ссылки", async () => {
    await put([{ ...TELEGRAM, urlTemplate: "javascript:alert(document.cookie)//{handle}" }]).expect(400);
    expect(messengerChannels.replace).not.toHaveBeenCalled();
  });

  it("требует {handle} в шаблоне, иначе кнопка ведёт в никуда", async () => {
    await put([{ ...TELEGRAM, urlTemplate: "https://t.me/" }]).expect(400);
    expect(messengerChannels.replace).not.toHaveBeenCalled();
  });

  it("не принимает два канала с одинаковым идентификатором", async () => {
    const response = await put([TELEGRAM, { ...TELEGRAM, handle: "other" }]).expect(400);
    expect(response.body.error).toContain("Повтор");
    expect(messengerChannels.replace).not.toHaveBeenCalled();
  });
});
