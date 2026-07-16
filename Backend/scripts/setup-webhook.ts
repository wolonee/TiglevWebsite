import { bot } from "../src/telegram.js";
import { config } from "../src/config.js";
import { ensureSchema } from "../src/database.js";

if (!config.WEBHOOK_URL) throw new Error("WEBHOOK_URL is required to configure Telegram webhook");
await ensureSchema();
const webhookUrl = `${config.WEBHOOK_URL.replace(/\/$/, "")}/api/telegram`;
await bot.api.setMyCommands([
  { command: "start", description: "Включить уведомления о заявках" },
  { command: "stop", description: "Отключить уведомления" },
  { command: "help", description: "Показать доступные команды" },
]);
await bot.api.setWebhook(webhookUrl, {
  secret_token: config.TELEGRAM_WEBHOOK_SECRET,
  allowed_updates: ["message"],
  drop_pending_updates: false,
});
console.log(`Telegram webhook configured: ${webhookUrl}`);
