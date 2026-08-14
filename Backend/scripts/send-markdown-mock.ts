import { config } from "../src/config.js";
import { subscribers } from "../src/database.js";

const message = [
  "# 🚘 Новая заявка на выкуп автомобиля",
  "",
  "**Марка и модель:** KIA Sport",
  "**Год выпуска:** 2020",
  "**Тип кузова:** Кроссовер",
  "**Двигатель:** Бензин",
  "**Руль:** Правый",
  "**КПП:** Механика",
  "**Пробег:** 75000 км",
  "",
  "## 👤 Контактные данные",
  "",
  "**Имя:** ex pin",
  "**Телефон:** +7 8996341634",
  "**E-mail:** expin12267@gmail.com",
  "",
  "![](https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=1200&h=900&fit=crop)",
  "",
  "![](https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1200&h=900&fit=crop)",
  "",
  "![](https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&h=900&fit=crop)",
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
