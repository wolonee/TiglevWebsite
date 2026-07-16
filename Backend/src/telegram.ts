import { Bot, GrammyError, InputFile } from "grammy";
import type { InputMediaPhoto } from "grammy/types";
import type { Express } from "express";
import { config } from "./config.js";
import { subscribers } from "./database.js";

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

bot.command("start", async (context) => {
  const user = context.from;
  await subscribers.upsert({ chatId: context.chat.id, username: user?.username, firstName: user?.first_name, lastName: user?.last_name });
  await context.reply([
    "✅ Бот TIGLEV.COM активен!",
    "",
    "Вы успешно зарегистрированы и подписаны на новые заявки с сайта.",
    "Когда клиент отправит форму «Продать авто», сюда придут его данные и фотографии.",
    "",
    "Чтобы отключить уведомления, отправьте /stop.",
  ].join("\n"));
});

bot.command("stop", async (context) => {
  await subscribers.remove(context.chat.id);
  await context.reply("Уведомления о новых заявках отключены. Для повторной подписки отправьте /start.");
});

bot.command("help", async (context) => {
  await context.reply("/start — включить уведомления\n/stop — отключить уведомления\n/help — показать команды");
});

bot.catch(({ error }) => console.error("Telegram bot error:", error));

const escapeMarkdown = (value: string) => value.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, "\\$&");

export type SellRequest = {
  model: string;
  year: string;
  body?: string;
  engine?: string;
  wheel?: string;
  transmission?: string;
  mileage?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
};

const line = (label: string, value?: string) => value ? `*${escapeMarkdown(label)}:* ${escapeMarkdown(value)}` : null;

function formatRequest(data: SellRequest): string {
  return [
    "🚘 *Новая заявка на выкуп автомобиля*",
    "",
    line("Марка и модель", data.model), line("Год выпуска", data.year), line("Тип кузова", data.body),
    line("Двигатель", data.engine), line("Руль", data.wheel), line("КПП", data.transmission), line("Пробег", data.mileage ? `${data.mileage} км` : undefined),
    "", "👤 *Контактные данные*", line("Имя", `${data.firstName} ${data.lastName}`), line("Телефон", data.phone), line("E-mail", data.email),
  ].filter((item): item is string => item !== null).join("\n");
}

export async function broadcastSellRequest(data: SellRequest, photos: Express.Multer.File[]) {
  const recipients = await subscribers.all();
  const text = formatRequest(data);
  let delivered = 0;

  for (const subscriber of recipients) {
    try {
      await bot.api.sendMessage(subscriber.chat_id, text, { parse_mode: "MarkdownV2" });
      if (photos.length) {
        const media: InputMediaPhoto[] = photos.slice(0, 10).map((photo) => ({ type: "photo", media: new InputFile(photo.buffer, photo.originalname) }));
        await bot.api.sendMediaGroup(subscriber.chat_id, media);
      }
      delivered += 1;
    } catch (error) {
      console.error(`Failed to deliver request to ${subscriber.chat_id}:`, error);
      if (error instanceof GrammyError && [400, 403].includes(error.error_code)) await subscribers.remove(subscriber.chat_id);
    }
  }
  return { recipients: recipients.length, delivered };
}
