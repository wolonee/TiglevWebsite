import { afterEach, describe, expect, it, vi } from "vitest";
import { formatPrice } from "@/data/cars";
import { leadMessage, messengerLinks } from "@/data/messengers";

const CAR = { brand: "BMW", model: "5 Series", year: 2022, price: 5_115_817 };

const setHandles = (telegram: string, max: string, vk: string) => {
  vi.stubEnv("NEXT_PUBLIC_TELEGRAM_USERNAME", telegram);
  vi.stubEnv("NEXT_PUBLIC_MAX_USERNAME", max);
  vi.stubEnv("NEXT_PUBLIC_VK_USERNAME", vk);
};

afterEach(() => vi.unstubAllEnvs());

describe("messengers", () => {
  it("кладёт в сообщение модель, цену и ссылку на страницу", () => {
    const message = leadMessage(CAR, "https://tiglev.com/catalog/cc-465823");

    expect(message).toContain("BMW 5 Series 2022");
    expect(message).toContain(formatPrice(CAR.price));
    expect(message).toContain("https://tiglev.com/catalog/cc-465823");
  });

  it("подставляет ссылку владельца для MAX по умолчанию", () => {
    setHandles("", "", "");
    const max = messengerLinks("привет").find((link) => link.id === "max");

    // У MAX нет публичных ников, но личная ссылка владельца уже опубликована —
    // держим её дефолтом, как у Telegram и VK, чтобы кнопка не пропадала без
    // переменной окружения (живое значение всё равно приходит из админки).
    expect(max?.href).toMatch(/^https:\/\/max\.ru\/u\/.+/);
  });

  it("не показывает мессенджер без ника", () => {
    // Пустой ник = канала на сайте нет: кнопка не должна вести в никуда.
    const links = messengerLinks("привет", [
      { id: "telegram", label: "Telegram", handle: "tiglev", urlTemplate: "https://t.me/{handle}?text={message}", prefillsMessage: true, enabled: true },
      { id: "max", label: "MAX", handle: "", urlTemplate: "https://max.ru/u/{handle}", prefillsMessage: false, enabled: true },
    ]);

    expect(links.map((link) => link.id)).toEqual(["telegram"]);
  });

  it("оставляет Telegram и VK даже без переменных: эти аккаунты уже известны", () => {
    setHandles("", "", "");
    const byId = Object.fromEntries(messengerLinks("привет").map((link) => [link.id, link]));

    // Без значений по умолчанию кнопка пропадала на любой сборке, где
    // переменную забыли задать, и заметить это можно было только глазами.
    expect(byId.vk?.href).toBe("https://vk.me/prosto_tigl");
    expect(byId.telegram?.href).toContain("https://t.me/NARCI33IST");
  });

  it("показывает MAX, как только появился ник", () => {
    setHandles("", "tiglev_max", "");
    const max = messengerLinks("привет").find((link) => link.id === "max");

    expect(max?.href).toBe("https://max.ru/u/tiglev_max");
  });

  it("берёт каналы из админки вместо переменных, когда они переданы", () => {
    setHandles("env_telegram", "env_max", "env_vk");
    const links = messengerLinks("привет", [
      { id: "telegram", label: "Telegram", handle: "from_admin", urlTemplate: "https://t.me/{handle}?text={message}", prefillsMessage: true, enabled: true },
      // Выключенный канал администратор оставил в списке, но на сайте его быть
      // не должно — иначе кнопка «отключить» не значит ничего.
      { id: "vk", label: "VK", handle: "prosto_tigl", urlTemplate: "https://vk.me/{handle}", prefillsMessage: false, enabled: false },
    ]);

    expect(links.map((link) => link.id)).toEqual(["telegram"]);
    expect(links[0].href).toContain("https://t.me/from_admin");
  });

  it("собирает ссылку по шаблону: так добавляют канал, которого нет в коде", () => {
    const [link] = messengerLinks("Здравствуйте", [
      { id: "whatsapp", label: "WhatsApp", handle: "79991234567", urlTemplate: "https://wa.me/{handle}?text={message}", prefillsMessage: true, enabled: true },
    ]);

    expect(link.href).toBe(`https://wa.me/79991234567?text=${encodeURIComponent("Здравствуйте")}`);
  });

  it("подставляет текст только в Telegram: у Max и VK такого параметра нет", () => {
    setHandles("@tiglev_auto", "tiglev", "tiglev");
    const byId = Object.fromEntries(messengerLinks("Здравствуйте! Интересует BMW").map((link) => [link.id, link]));

    // Собака в нике не должна попасть в адрес.
    expect(byId.telegram.href).toBe(
      `https://t.me/tiglev_auto?text=${encodeURIComponent("Здравствуйте! Интересует BMW")}`,
    );
    expect(byId.telegram.prefillsMessage).toBe(true);
    expect(byId.max.href).toBe("https://max.ru/u/tiglev");
    expect(byId.max.prefillsMessage).toBe(false);
    expect(byId.vk.href).toBe("https://vk.me/tiglev");
  });
});
