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

export type ContactRequest = {
  name: string;
  phone: string;
  message?: string;
  source?: string;
  /** Заполнено, когда заявку оставили со страницы конкретного автомобиля. */
  carTitle?: string;
  carPrice?: string;
  carUrl?: string;
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

/**
 * Кому слать уведомление.
 *
 * Подписчиком бота становится любой, кто нажал «Старт», поэтому по умолчанию
 * список сужен до администратора из `TELEGRAM_ADMIN_CHAT_IDS`: заявки клиентов
 * с телефонами не должны уходить случайным людям. Имя и ник подтягиваем из
 * подписчиков, если человек там есть, — они нужны только для логов.
 */
async function getRecipients(): Promise<{ chat_id: number }[]> {
  const allowed = config.TELEGRAM_ADMIN_CHAT_IDS
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id !== 0);

  return allowed.length ? allowed.map((chat_id) => ({ chat_id })) : await subscribers.all();
}

export async function broadcastSellRequest(data: SellRequest, photos: Express.Multer.File[]) {
  const recipients = await getRecipients();
  const text = formatRequest(data);
  let delivered = 0;

  for (const subscriber of recipients) {
    try {
      await bot.api.sendMessage(subscriber.chat_id, text, { parse_mode: "MarkdownV2" });
      if (photos.length === 1) {
        const photo = photos[0]!;
        await bot.api.sendPhoto(subscriber.chat_id, new InputFile(photo.buffer, photo.originalname));
      } else if (photos.length > 1) {
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

export async function broadcastContactRequest(data: ContactRequest) {
  const recipients = await getRecipients();
  const text = [
    data.carTitle ? "🚗 *Заявка на автомобиль*" : "💬 *Новая заявка с формы «Написать нам»*",
    "",
    line("Автомобиль", data.carTitle),
    line("Цена", data.carPrice),
    line("Ссылка", data.carUrl),
    data.carTitle ? "" : null,
    line("Имя", data.name),
    line("Телефон", data.phone),
    line("Сообщение", data.message),
    // Адрес страницы дублирует ссылку на лот — во второй раз его не печатаем.
    data.carUrl ? null : line("Страница", data.source),
  ].filter((item): item is string => item !== null).join("\n");
  let delivered = 0;

  for (const subscriber of recipients) {
    try {
      await bot.api.sendMessage(subscriber.chat_id, text, { parse_mode: "MarkdownV2" });
      delivered += 1;
    } catch (error) {
      console.error(`Failed to deliver contact request to ${subscriber.chat_id}:`, error);
      if (error instanceof GrammyError && [400, 403].includes(error.error_code)) await subscribers.remove(subscriber.chat_id);
    }
  }
  return { recipients: recipients.length, delivered };
}


/**
 * Переход в мессенджер — тоже заявка, просто разговор пойдёт не у нас.
 *
 * Без этого уведомления администратор узнаёт о человеке, только когда тот сам
 * напишет, и не знает, из-за какой машины. Имени здесь быть не может: при
 * переходе мы о человеке ничего не знаем. Опознать помогает сама машина —
 * в мессенджер уходит заготовленный текст с ней же.
 */
export async function broadcastMessengerLead(data: {
  messenger: string;
  title: string;
  price?: string;
  /** Карточка на нашем сайте. */
  url?: string;
  /** Лот у партнёра. У своих машин его нет и быть не может. */
  partnerUrl?: string;
  /** Своя машина из салона или импорт под заказ. */
  own?: boolean;
}) {
  const recipients = await getRecipients();
  const where = { telegram: "Telegram", vk: "VK", max: "Max" }[data.messenger] ?? data.messenger;
  const lines = [
    `💬 Переход в ${where}`,
    "",
    data.title,
    data.price ? `Цена: ${data.price}` : "",
    // Разница важна на практике: свою машину показывают в Тольятти сегодня,
    // импортную везут полтора месяца, и разговор строится иначе.
    data.own ? "🏠 Наша машина, в наличии" : "🚢 Импорт под заказ",
    "",
    data.url ? `Карточка: ${data.url}` : "",
    data.partnerUrl ? `У партнёра: ${data.partnerUrl}` : "",
    "",
    "Человек открыл чат с заготовленным сообщением. Ждите обращения.",
  ].filter(Boolean);
  const text = lines.join("\n");

  let delivered = 0;
  for (const subscriber of recipients) {
    try {
      // Без разметки: в названии машины попадаются символы, которые
      // MarkdownV2 требует экранировать, и одна «(» роняет всю отправку.
      await bot.api.sendMessage(subscriber.chat_id, text, { link_preview_options: { is_disabled: true } });
      delivered += 1;
    } catch (error) {
      console.error(`Failed to deliver messenger lead to ${subscriber.chat_id}:`, error);
      if (error instanceof GrammyError && [400, 403].includes(error.error_code)) await subscribers.remove(subscriber.chat_id);
    }
  }
  return { recipients: recipients.length, delivered };
}
