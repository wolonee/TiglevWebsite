import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Кому бот отправляет уведомления.
 *
 * Подписчиком становится любой, кто нажал «Старт», — а в уведомлениях едут
 * телефоны клиентов. Поэтому список получателей задаётся настройкой, а не
 * тем, кто успел подписаться.
 */

const sendMessage = vi.fn();
const subscribers = { all: vi.fn() };
const config = {
  TELEGRAM_BOT_TOKEN: "test-token-00000000000000",
  TELEGRAM_ADMIN_CHAT_IDS: "324430515",
};

vi.mock("../src/config.js", () => ({ config }));
vi.mock("../src/database.js", () => ({ subscribers }));
vi.mock("grammy", () => ({
  Bot: class {
    api = { sendMessage };
    command() {}
    on() {}
    catch() {}
  },
  GrammyError: class extends Error {},
  InputFile: class {},
}));

const { broadcastMessengerLead } = await import("../src/telegram.js");

const LEAD = { messenger: "telegram", title: "MG MG3 2026 г.", own: false };

describe("получатели уведомлений", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMessage.mockResolvedValue({});
    subscribers.all.mockResolvedValue([{ chat_id: 111 }, { chat_id: 222 }]);
    config.TELEGRAM_ADMIN_CHAT_IDS = "324430515";
  });

  it("пишет только администратору, а не всем подписчикам бота", async () => {
    const result = await broadcastMessengerLead(LEAD);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][0]).toBe(324430515);
    expect(result.recipients).toBe(1);
    // К подписчикам вообще не ходим: список задан настройкой.
    expect(subscribers.all).not.toHaveBeenCalled();
  });

  it("принимает несколько получателей через запятую", async () => {
    config.TELEGRAM_ADMIN_CHAT_IDS = "324430515, 987654321";
    await broadcastMessengerLead(LEAD);

    expect(sendMessage.mock.calls.map((call) => call[0])).toEqual([324430515, 987654321]);
  });

  it("без настройки возвращается к прежнему поведению — всем подписчикам", async () => {
    config.TELEGRAM_ADMIN_CHAT_IDS = "";
    await broadcastMessengerLead(LEAD);

    expect(sendMessage.mock.calls.map((call) => call[0])).toEqual([111, 222]);
  });

  it("мусор в настройке не превращается в отправку в никуда", async () => {
    config.TELEGRAM_ADMIN_CHAT_IDS = "не число, 0";
    await broadcastMessengerLead(LEAD);

    // Ни одного валидного id — падаем на подписчиков, а не шлём в чат «0».
    expect(sendMessage.mock.calls.map((call) => call[0])).toEqual([111, 222]);
  });
});
