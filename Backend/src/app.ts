import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { webhookCallback } from "grammy";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { config } from "./config.js";
import { sendContactRequestEmail, sendSellRequestEmail } from "./email.js";
import { bot, broadcastContactRequest, broadcastSellRequest } from "./telegram.js";
import { carRecords, carStatuses, customerRequests } from "./database.js";

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
const contactRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(30),
  message: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(100).optional(),
});
const optionalText = z.string().trim().max(200).optional();
const carSchema = z.object({
  brand: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(100),
  price: z.coerce.number().int().positive().max(1_000_000_000), year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  images: z.array(z.string().url()).min(1).max(20), bodyType: z.string().trim().min(1).max(80),
  engine: z.string().trim().min(1).max(80), description: z.string().trim().max(5000).optional(),
  engineVolume: optionalText, power: optionalText, transmission: optionalText,
  mileage: z.coerce.number().int().nonnegative().max(10_000_000).optional(), drive: optionalText,
  wheel: optionalText, color: optionalText, damage: optionalText,
  status: z.enum(carStatuses).default("active"),
});
const requestUpdateSchema = z.object({ status: z.enum(["new", "in_progress", "completed", "archived"]), note: z.string().trim().max(4000).optional() });
const orderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) });

app.get("/health", (_request, response) => response.json({ ok: true }));
app.get("/api/cars", async (_request, response) => response.json({ cars: await carRecords.active() }));
app.get("/api/cars/:id", async (request, response) => {
  const car = await carRecords.find(request.params.id);
  return car?.status === "active" ? response.json({ car }) : response.status(404).json({ error: "Car not found" });
});
app.get("/api/admin/cars", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  return response.json({ cars: await carRecords.all(request.query.deleted === "true") });
});
app.get("/api/admin/cars/:id", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const car = await carRecords.find(request.params.id, true);
  return car ? response.json({ car }) : response.status(404).json({ error: "Car not found" });
});
app.get("/api/admin/cars/:id/history", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  return response.json({ history: await carRecords.history(request.params.id) });
});
app.post("/api/admin/cars/:id/restore", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const car = await carRecords.restore(request.params.id);
  return car ? response.json({ car }) : response.status(404).json({ error: "Car not found" });
});
app.post("/api/admin/cars", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const parsed = carSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
  const car = await carRecords.create({ id: randomUUID(), ...parsed.data });
  return response.status(201).json({ car });
});
app.patch("/api/admin/cars/:id", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const parsed = carSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
  const previous = await carRecords.find(request.params.id);
  if (!previous) return response.status(404).json({ error: "Car not found" });
  const car = await carRecords.update(request.params.id, parsed.data);
  const removedImages = previous.images.filter((image) => !parsed.data.images.includes(image));
  return response.json({ car, removedImages });
});
app.delete("/api/admin/cars/:id", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const car = await carRecords.remove(request.params.id);
  return car ? response.json({ car }) : response.status(404).json({ error: "Car not found" });
});
app.put("/api/admin/cars/order", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const parsed = orderSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "Validation failed" });
  return response.json({ cars: await carRecords.reorder(parsed.data.ids) });
});
app.get("/api/admin/requests", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  return response.json({ requests: await customerRequests.all() });
});
app.patch("/api/admin/requests/:id", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const parsed = requestUpdateSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "Validation failed" });
  const customerRequest = await customerRequests.update(request.params.id, parsed.data);
  return customerRequest ? response.json({ request: customerRequest }) : response.status(404).json({ error: "Request not found" });
});
app.post("/api/telegram", (request, response) => {
  if (request.header("x-telegram-bot-api-secret-token") !== config.TELEGRAM_WEBHOOK_SECRET) return response.sendStatus(401);
  return webhookCallback(bot, "express")(request, response);
});
app.post("/api/sell-requests", limiter, upload.array("photos", 10), async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const parsed = requestSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
  try {
    const photos = (request.files ?? []) as Express.Multer.File[];
    await customerRequests.create({ id: randomUUID(), kind: "sell", payload: parsed.data, photoCount: photos.length });
    const [telegramResult, emailResult] = await Promise.allSettled([
      broadcastSellRequest(parsed.data, photos),
      sendSellRequestEmail(parsed.data, photos),
    ]);
    if (telegramResult.status === "rejected") console.error("Telegram delivery failed:", telegramResult.reason);
    if (emailResult.status === "rejected") console.error("Email delivery failed:", emailResult.reason);

    const telegram = telegramResult.status === "fulfilled" ? telegramResult.value : { recipients: 0, delivered: 0 };
    const emailDelivered = emailResult.status === "fulfilled";
    if (telegram.delivered === 0 && !emailDelivered) {
      return response.status(502).json({ error: "Failed to deliver request" });
    }
    return response.status(201).json({ ok: true, telegram, emailDelivered });
  } catch (error) {
    console.error("Sell request broadcast failed:", error);
    return response.status(500).json({ error: "Failed to deliver request" });
  }
});
app.post("/api/contact-requests", limiter, async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const parsed = contactRequestSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });

  await customerRequests.create({ id: randomUUID(), kind: "contact", payload: parsed.data, photoCount: 0 });
  const [telegramResult, emailResult] = await Promise.allSettled([
    broadcastContactRequest(parsed.data),
    sendContactRequestEmail(parsed.data),
  ]);
  if (telegramResult.status === "rejected") console.error("Contact Telegram delivery failed:", telegramResult.reason);
  if (emailResult.status === "rejected") console.error("Contact email delivery failed:", emailResult.reason);

  const telegram = telegramResult.status === "fulfilled" ? telegramResult.value : { recipients: 0, delivered: 0 };
  const emailDelivered = emailResult.status === "fulfilled";
  if (telegram.delivered === 0 && !emailDelivered) {
    return response.status(502).json({ error: "Failed to deliver contact request" });
  }
  return response.status(201).json({ ok: true, telegram, emailDelivered });
});
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled backend error:", error);
  response.status(500).json({ error: "Internal server error" });
});

export default app;
