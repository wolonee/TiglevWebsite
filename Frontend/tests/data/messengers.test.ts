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

  it("не показывает мессенджер без ника — кроме замоканного MAX", () => {
    setHandles("", "", "vk_account");
    const links = messengerLinks("привет");

    expect(links.map((link) => link.id)).toEqual(["max", "vk"]);
    // Заглушка ведёт на сайт мессенджера, а не в чат: аккаунта ещё нет.
    expect(links.find((link) => link.id === "max")).toMatchObject({
      isMock: true,
      href: "https://max.ru/",
    });
  });

  it("оставляет VK даже без переменной: этот аккаунт уже опубликован на сайте", () => {
    setHandles("", "", "");
    expect(messengerLinks("привет").find((link) => link.id === "vk")?.href).toBe("https://vk.me/tiglev");
  });

  it("перестаёт мокать MAX, как только появился ник", () => {
    setHandles("", "tiglev_max", "");
    const max = messengerLinks("привет").find((link) => link.id === "max");

    expect(max?.href).toBe("https://max.ru/tiglev_max");
    expect(max?.isMock).toBeUndefined();
  });

  it("подставляет текст только в Telegram: у Max и VK такого параметра нет", () => {
    setHandles("@tiglev_auto", "tiglev", "tiglev");
    const byId = Object.fromEntries(messengerLinks("Здравствуйте! Интересует BMW").map((link) => [link.id, link]));

    // Собака в нике не должна попасть в адрес.
    expect(byId.telegram.href).toBe(
      `https://t.me/tiglev_auto?text=${encodeURIComponent("Здравствуйте! Интересует BMW")}`,
    );
    expect(byId.telegram.prefillsMessage).toBe(true);
    expect(byId.max.href).toBe("https://max.ru/tiglev");
    expect(byId.max.prefillsMessage).toBe(false);
    expect(byId.vk.href).toBe("https://vk.me/tiglev");
  });
});
