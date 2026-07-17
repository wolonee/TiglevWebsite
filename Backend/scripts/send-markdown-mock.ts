import { bot } from "../src/telegram.js";
import { subscribers } from "../src/database.js";

const message = [
  "🚘 *Тестовая заявка: авто на заказ*",
  "",
  "> _Демонстрация форматирования Telegram MarkdownV2_",
  "",
  "*Пожелания клиента*",
  "• Автомобиль: *Toyota Camry*",
  "• Год выпуска: `2023`",
  "• Страна: Япония 🇯🇵",
  "• Бюджет: __до 4 500 000 ₽__",
  "• Цвет: белый или чёрный",
  "",
  "*Контактные данные*",
  "• Имя: Иван Петров",
  "• Телефон: `+7 999 123\-45\-67`",
  "",
  "~Старое пожелание: левый руль~",
  "||Внутренняя заметка: клиент готов внести предоплату||",
  "",
  "Идентификатор заявки: `TEST\-ORDER\-001`",
  "[Открыть страницу «Авто на заказ»](https://tiglev-website.vercel.app/import)",
].join("\n");

async function sendMock() {
  const recipients = await subscribers.all();
  if (recipients.length === 0) throw new Error("No Telegram subscribers found");

  const results = await Promise.allSettled(
    recipients.map((subscriber) => bot.api.sendMessage(subscriber.chat_id, message, { parse_mode: "MarkdownV2" })),
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
