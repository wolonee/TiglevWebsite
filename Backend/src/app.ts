import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { webhookCallback } from "grammy";
import multer from "multer";
import { z } from "zod";
import { config } from "./config.js";
import { bot, broadcastSellRequest } from "./telegram.js";

export const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: config.FRONTEND_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 10, fileSize: 8 * 1024 * 1024, fields: 20 },
  fileFilter: (_request, file, callback) => callback(null, file.mimetype.startsWith("image/")),
});
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
const requestSchema = z.object({
  model: z.string().trim().min(1).max(100), year: z.string().regex(/^\d{4}$/),
  body: z.string().max(50).optional(), engine: z.string().max(50).optional(), wheel: z.string().max(50).optional(),
  transmission: z.string().max(50).optional(), mileage: z.string().max(20).optional(),
  firstName: z.string().trim().min(2).max(50), lastName: z.string().trim().min(2).max(50),
  email: z.union([z.literal(""), z.string().email()]).optional(), phone: z.string().min(7).max(30),
});

app.get("/health", (_request, response) => response.json({ ok: true }));
app.post("/api/telegram", (request, response) => {
  if (request.header("x-telegram-bot-api-secret-token") !== config.TELEGRAM_WEBHOOK_SECRET) return response.sendStatus(401);
  return webhookCallback(bot, "express")(request, response);
});
app.post("/api/sell-requests", limiter, upload.array("photos", 10), async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const parsed = requestSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
  try {
    const result = await broadcastSellRequest(parsed.data, (request.files ?? []) as Express.Multer.File[]);
    return response.status(201).json({ ok: true, ...result });
  } catch (error) {
    console.error("Sell request broadcast failed:", error);
    return response.status(500).json({ error: "Failed to deliver request" });
  }
});
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled backend error:", error);
  response.status(500).json({ error: "Internal server error" });
});

export default app;
