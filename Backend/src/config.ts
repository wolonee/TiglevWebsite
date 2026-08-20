import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(20),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16),
  WEBHOOK_URL: z.string().url().optional(),
  BACKEND_API_KEY: z.string().min(16),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(10).optional(),
  EMAIL_RECIPIENT: z.string().email(),
  EMAIL_FROM: z.string().default("TIGLEV.COM <onboarding@resend.dev>"),
  /**
   * Кому уходят уведомления бота. Список chat id через запятую.
   *
   * Раньше бот писал всем, кто когда-либо на него подписался, — а это любой,
   * кто нажал «Старт». Заявки клиентов уходили бы посторонним. Пусто —
   * возвращается прежнее поведение (всем подписчикам).
   */
  TELEGRAM_ADMIN_CHAT_IDS: z.string().default("324430515"),
  // Реферальная метка партнёрки CarClick. Пока её нет — ссылки уходят чистыми,
  // переход не оплачивается. Появится код — достаточно задать переменную.
  CARCLICK_REF_PARAM: z.string().default("r"),
  CARCLICK_REF_CODE: z.string().optional(),
});

export const config = schema.parse(process.env);
