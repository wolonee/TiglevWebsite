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
  EMAIL_RECIPIENT: z.string().email().default("expin12267@gmail.com"),
  EMAIL_FROM: z.string().default("TIGLEV.COM <onboarding@resend.dev>"),
});

export const config = schema.parse(process.env);
