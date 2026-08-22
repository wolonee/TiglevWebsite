import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { webhookCallback } from "grammy";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { config } from "./config.js";
import { sendContactRequestEmail, sendSellRequestEmail } from "./email.js";
import { bot, broadcastContactRequest, broadcastMessengerLead, broadcastSellRequest } from "./telegram.js";
import { carRecords, carStatuses, customerRequests } from "./database.js";
import { PAGE_SIZE, countCatalog, fetchCatalogPage, fetchLot, parseFilters } from "./catalog.js";
import { recordEvent, rollup, summary } from "./analytics.js";
import { messengerChannels } from "./messengers.js";
import { siteContent } from "./content.js";

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
  photoUrls: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try { return JSON.parse(value); } catch { return value; }
  }, z.array(z.string().url().refine((url) => {
    try { return new URL(url).hostname.endsWith(".blob.vercel-storage.com"); } catch { return false; }
  }, "Invalid photo URL")).max(10)).default([]),
});
const contactRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(30),
  message: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(100).optional(),
  // Заявка со страницы автомобиля. Плоские строки, а не вложенный объект:
  // админка, Telegram и письмо печатают значения payload как есть.
  carTitle: z.string().trim().max(200).optional(),
  carPrice: z.string().trim().max(50).optional(),
  // Ссылку админ открывает из Telegram и письма, поэтому кроме http(s) ничего
  // не принимаем: `javascript:` и `data:` — валидные URL с точки зрения парсера.
  carUrl: z.union([
    z.literal(""),
    z.url().max(500).refine((value) => /^https?:$/.test(new URL(value).protocol), "Unsupported protocol"),
  ]).optional(),
});
const optionalText = z.string().trim().max(200).optional();
const carImageUrlSchema = z.string().refine(
  (value) => /^\/images\/catalog(?:-hq)?\//.test(value) || z.url().safeParse(value).success,
  "Invalid image URL",
);
const imagePositionSchema = z.object({
  x: z.number().min(0).max(100).default(50),
  y: z.number().min(0).max(100).default(50),
});
const carImageSchema = z.union([
  carImageUrlSchema,
  z.object({ url: carImageUrlSchema, position: imagePositionSchema.optional() }),
]).transform((image) => typeof image === "string"
  ? { url: image, position: { x: 50, y: 50 } }
  : { url: image.url, position: { x: image.position?.x ?? 50, y: image.position?.y ?? 50 } });
const carSchema = z.object({
  brand: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(100),
  price: z.coerce.number().int().positive().max(1_000_000_000), year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  images: z.array(carImageSchema).min(1).max(20), bodyType: z.string().trim().max(80),
  engine: z.string().trim().max(80), description: z.string().trim().max(5000).optional(),
  engineVolume: optionalText, power: optionalText, transmission: optionalText,
  mileage: z.coerce.number().int().nonnegative().max(10_000_000).optional(), drive: optionalText,
  wheel: optionalText, color: optionalText, damage: optionalText,
  status: z.enum(carStatuses).default("active"),
});
const requestUpdateSchema = z.object({ status: z.enum(["new", "viewed", "in_progress", "completed", "archived"]), note: z.string().trim().max(4000).optional() });
const orderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) });
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

app.get("/health", (_request, response) => response.json({ ok: true }));
app.get("/api/cars", async (_request, response) => response.json({ cars: await carRecords.active() }));

// Каталог CarClick. Витрина ходит сюда вместо прямых запросов к схеме `catalog`:
// у данных должен быть один владелец, иначе структуру таблиц знают два проекта.
app.get("/api/catalog/lots", async (request, response) => {
  const filters = parseFilters(request.query as Record<string, unknown>);
  const cursorRaw = Number(request.query.cursor);
  const cursor = Number.isFinite(cursorRaw) && cursorRaw > 0 ? cursorRaw : undefined;
  const limitRaw = Number(request.query.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : PAGE_SIZE;
  return response.json(await fetchCatalogPage(filters, cursor, limit));
});

app.get("/api/catalog/count", async (request, response) => {
  const filters = parseFilters(request.query as Record<string, unknown>);
  return response.json({ total: await countCatalog(filters) });
});

// Сбор посещений. Открыт наружу — его зовёт браузер посетителя; пишем только
// обезличенное (страница, источник перехода, тип устройства), без IP и куки.
app.post("/api/analytics/event", limiter, async (request, response) => {
  const body = request.body as Record<string, unknown>;
  const result = await recordEvent(
    {
      type: String(body.type ?? ""),
      path: String(body.path ?? "/"),
      referrer: typeof body.referrer === "string" ? body.referrer : undefined,
      visitor: typeof body.visitor === "string" ? body.visitor : undefined,
      lotId: Number.isFinite(Number(body.lotId)) ? Number(body.lotId) : undefined,
      country: typeof body.country === "string" ? body.country : undefined,
      messenger: typeof body.messenger === "string" ? body.messenger : undefined,
    },
    request.header("user-agent"),
  );
  // Переход в мессенджер — это заявка, о ней администратор должен узнать сразу,
  // а не когда человек сам напишет. Название машины берём из базы, а не из тела
  // запроса: текст уходит в Telegram, и доверять ему присланному нельзя.
  if (result.ok && String(body.type) === "outbound" && typeof body.messenger === "string") {
    try {
      // Импортный лот или своя машина — определяем по числовому id.
      // У лотов CarClick он есть, у своих машин id текстовый (`kia-sorento-2017`).
      const lotId = Number.isFinite(Number(body.lotId)) ? Number(body.lotId) : null;
      const carId = typeof body.carId === "string" ? body.carId.slice(0, 100) : undefined;

      let title = "Автомобиль из каталога";
      let price: string | undefined;
      let partnerUrl: string | undefined;
      let own = false;

      if (lotId) {
        const lot = await fetchLot(lotId);
        const row = lot?.row as Record<string, unknown> | undefined;
        if (row) {
          title = [row.brand, row.model, row.year ? `${row.year} г.` : ""].filter(Boolean).join(" ");
          if (row.price_individual) price = `${Number(row.price_individual).toLocaleString("ru-RU")} ₽`;
        }
        // Ссылка на лот у партнёра. CarClick отдаёт карточку по адресу
        // /marketplace/{страна}/{марка}/{модель}/{id}; короткий /marketplace/{id}
        // — это 404, поэтому коды берём из самой строки лота. Реферальная метка
        // добавляется, только когда партнёрка подтверждена: без неё переход
        // всё равно не оплачивается.
        const ref = config.CARCLICK_REF_CODE
          ? `?${config.CARCLICK_REF_PARAM}=${encodeURIComponent(config.CARCLICK_REF_CODE)}`
          : "";
        const slug = (value: unknown) => (typeof value === "string" ? value.trim() : "");
        const country = slug(row?.country_code);
        const brand = slug(row?.brand_code);
        const model = slug(row?.model_code);
        partnerUrl = country && brand && model
          ? `https://carclick.ru/marketplace/${country}/${brand}/${model}/${lotId}${ref}`
          : undefined;
      } else if (carId) {
        own = true;
        const car = await carRecords.find(carId);
        if (car) {
          title = [car.brand, car.model, car.year ? `${car.year} г.` : ""].filter(Boolean).join(" ");
          price = `${car.price.toLocaleString("ru-RU")} ₽`;
        }
      }

      await broadcastMessengerLead({
        messenger: String(body.messenger),
        title,
        price,
        own,
        partnerUrl,
        url: typeof body.pageUrl === "string" ? body.pageUrl.slice(0, 300) : undefined,
      });
    } catch (error) {
      // Уведомление не должно ломать приём события: статистика важнее.
      console.error("Messenger lead notification failed:", error);
    }
  }

  // Всегда 204: счётчик не должен ломать страницу и не должен подсказывать
  // роботу, что его отсеяли.
  return response.status(204).end();
});

// Сводка для админки. Закрыта тем же ключом, что и остальная админская часть.
app.get("/api/analytics/summary", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const days = Number(request.query.days);
  return response.json(await summary(Number.isFinite(days) && days > 0 ? days : 30));
});

// Свёртка суток в итоги и чистка сырых событий. Дёргается по расписанию.
app.post("/api/analytics/rollup", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  return response.json(await rollup());
});

app.get("/api/catalog/lots/:id", async (request, response) => {
  const lotId = Number(request.params.id);
  if (!Number.isFinite(lotId)) return response.status(400).json({ error: "Bad lot id" });
  const lot = await fetchLot(lotId);
  return lot ? response.json(lot) : response.status(404).json({ error: "Lot not found" });
});
app.get("/api/cars/:id", async (request, response) => {
  const car = await carRecords.find(request.params.id);
  return car?.status === "active" ? response.json({ car }) : response.status(404).json({ error: "Car not found" });
});
/**
 * Каналы связи для сайта. Без ключа: список публичный — эти же ссылки видит
 * любой посетитель карточки.
 */
app.get("/api/messengers", async (_request, response) => {
  return response.json({ channels: await messengerChannels.enabled() });
});

const messengerSchema = z.object({
  // Слаг, а не произвольная строка: он попадает в разметку и в статистику.
  id: z.string().trim().regex(/^[a-z0-9_-]{2,20}$/, "Латиница, цифры, дефис"),
  label: z.string().trim().min(1).max(30),
  handle: z.string().trim().min(1).max(80),
  // Шаблон ограничен https: ссылка ведёт покупателя наружу, и `javascript:`
  // в поле админки превратился бы в дыру на каждой карточке машины.
  urlTemplate: z.string().trim().url().startsWith("https://").max(300)
    .refine((value) => value.includes("{handle}"), "Нужен {handle}"),
  prefillsMessage: z.boolean(),
  enabled: z.boolean(),
});

/**
 * Ссылка из формы админки. Внутренний путь, телефон, почта или https —
 * и ничего больше: `javascript:` в пункте меню выполнялся бы у каждого
 * посетителя сайта.
 */
const linkHref = z.string().trim().min(1).max(300)
  .refine((value) => /^(\/|#|tel:|mailto:|https:\/\/)/.test(value), "Недопустимая ссылка");

const navLink = z.object({ href: linkHref, label: z.string().trim().min(1).max(40) });

const contentSchema = z.object({
  header: z.object({
    nav: z.array(navLink).max(8),
    ctaLabel: z.string().trim().min(1).max(30),
    ctaHref: linkHref,
  }),
  hero: z.object({
    badge: z.string().trim().max(60),
    titleLead: z.string().trim().min(1).max(80),
    titleAccent: z.string().trim().max(80),
    description: z.string().trim().max(400),
    stats: z.array(z.object({
      value: z.string().trim().min(1).max(20),
      label: z.string().trim().min(1).max(40),
    })).max(4),
  }),
  company: z.object({
    name: z.string().trim().min(1).max(60),
    about: z.string().trim().max(400),
    address: z.string().trim().max(160),
    phones: z.array(z.object({ label: z.string().trim().min(1).max(30), href: linkHref })).max(4),
    email: z.object({ label: z.string().trim().max(80), href: linkHref }),
    workHours: z.array(z.string().trim().min(1).max(60)).max(7),
    vkUrl: linkHref,
  }),
  footer: z.object({
    sections: z.array(z.object({
      title: z.string().trim().min(1).max(40),
      links: z.array(navLink).max(8),
    })).max(4),
  }),
});

/** Тексты сайта. Без ключа: это ровно то, что видит любой посетитель. */
app.get("/api/content", async (_request, response) => {
  return response.json({ content: await siteContent.get() });
});

app.get("/api/admin/content", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  return response.json({ content: await siteContent.get(), history: await siteContent.history() });
});

app.put("/api/admin/content", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const parsed = contentSchema.safeParse((request.body as { content?: unknown })?.content);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return response.status(400).json({ error: `${issue?.path.join(".") ?? "content"}: ${issue?.message ?? "некорректные данные"}` });
  }
  return response.json({ content: await siteContent.save(parsed.data) });
});

app.get("/api/admin/messengers", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  return response.json({ channels: await messengerChannels.all() });
});

app.put("/api/admin/messengers", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const parsed = z.object({ channels: z.array(messengerSchema).max(10) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" });

  const ids = parsed.data.channels.map((channel) => channel.id);
  if (new Set(ids).size !== ids.length) return response.status(400).json({ error: "Повторяющийся идентификатор" });

  const channels = await messengerChannels.replace(
    parsed.data.channels.map((channel, index) => ({ ...channel, position: index })),
  );
  return response.json({ channels });
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
  const nextImageUrls = new Set(parsed.data.images.map((image) => image.url));
  const removedImages = previous.images.map((image) => image.url).filter((url) => !nextImageUrls.has(url));
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
  const parsed = paginationSchema.safeParse(request.query);
  if (!parsed.success) return response.status(400).json({ error: "Invalid pagination" });
  const result = await customerRequests.all(parsed.data.page, parsed.data.limit);
  return response.json({ requests: result.items, pagination: { page: result.page, limit: result.limit, total: result.total } });
});
app.get("/api/admin/requests/:id", async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const customerRequest = await customerRequests.find(request.params.id);
  return customerRequest ? response.json({ request: customerRequest }) : response.status(404).json({ error: "Request not found" });
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
    const { photoUrls, ...requestData } = parsed.data;
    const [storageResult, telegramResult, emailResult] = await Promise.allSettled([
      customerRequests.create({ id: randomUUID(), kind: "sell", payload: requestData, photoCount: photoUrls.length, photoUrls }),
      broadcastSellRequest(requestData, photos),
      sendSellRequestEmail(requestData, photos),
    ]);
    if (storageResult.status === "rejected") throw storageResult.reason;
    if (telegramResult.status === "rejected") console.error("Telegram delivery failed:", telegramResult.reason);
    if (emailResult.status === "rejected") console.error("Email delivery failed:", emailResult.reason);

    const telegram = telegramResult.status === "fulfilled" ? telegramResult.value : { recipients: 0, delivered: 0 };
    const emailDelivered = emailResult.status === "fulfilled";
    return response.status(201).json({ ok: true, telegram, emailDelivered, notificationsDelivered: telegram.delivered > 0 || emailDelivered });
  } catch (error) {
    console.error("Sell request broadcast failed:", error);
    return response.status(500).json({ error: "Failed to deliver request" });
  }
});
app.post("/api/contact-requests", limiter, async (request, response) => {
  if (request.header("x-api-key") !== config.BACKEND_API_KEY) return response.status(401).json({ error: "Unauthorized" });
  const parsed = contactRequestSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });

  const [storageResult, telegramResult, emailResult] = await Promise.allSettled([
    customerRequests.create({ id: randomUUID(), kind: "contact", payload: parsed.data, photoCount: 0, photoUrls: [] }),
    broadcastContactRequest(parsed.data),
    sendContactRequestEmail(parsed.data),
  ]);
  if (storageResult.status === "rejected") throw storageResult.reason;
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
