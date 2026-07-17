import { config } from "../src/config.js";
import { subscribers } from "../src/database.js";

const message = [
  "# 🚘 Новая заявка: авто на заказ",
  "",
  "> Клиент ищет автомобиль из Японии под ключ.",
  "",
  "---",
  "",
  "## Параметры автомобиля",
  "",
  "| Параметр | Значение |",
  "|:--|:--|",
  "| Марка | **Toyota Camry** |",
  "| Год | `2023` |",
  "| Страна | Япония 🇯🇵 |",
  "| Бюджет | ==до 4 500 000 ₽== |",
  "| Цвет | белый или чёрный |",
  "",
  "## Этапы работы",
  "",
  "- [x] Получить заявку",
  "- [x] Уточнить требования",
  "- [ ] Подобрать варианты",
  "- [ ] Рассчитать доставку",
  "",
  "## Контактные данные",
  "",
  "1. **Клиент:** Иван Петров",
  "2. **Телефон:** [позвонить](tel:+79991234567)",
  "3. **Код заявки:** `TEST-ORDER-002`",
  "",
  "<details><summary>Комментарий для менеджера</summary>",
  "",
  "Клиент готов внести предоплату. ||Не сообщать окончательную цену до проверки аукционного листа.||",
  "",
  "</details>",
  "",
  "![](https://tiglev-website.vercel.app/images/hero-car.png \"Пример автомобиля\")",
  "",
  "[Открыть страницу «Авто на заказ»](https://tiglev-website.vercel.app/import)",
].join("\n");

type TelegramResponse = { ok: boolean; description?: string };

async function sendRichMessage(chatId: number) {
  const response = await fetch(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendRichMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, rich_message: { markdown: message } }),
  });
  const result = await response.json() as TelegramResponse;
  if (!response.ok || !result.ok) throw new Error(result.description ?? `Telegram API error ${response.status}`);
}

async function sendMock() {
  const recipients = await subscribers.all();
  if (recipients.length === 0) throw new Error("No Telegram subscribers found");

  const results = await Promise.allSettled(
    recipients.map((subscriber) => sendRichMessage(subscriber.chat_id)),
  );
  const delivered = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.length - delivered;
  console.log(`Telegram Markdown mock sent: ${delivered} delivered, ${failed} failed`);
  if (failed > 0) {
    results.forEach((result) => {
      if (result.status === "rejected") console.error(result.reason);
    });
    process.exitCode = 1;
  }
}

sendMock().catch((error) => {
  console.error("Failed to send Telegram Markdown mock:", error);
  process.exitCode = 1;
});
