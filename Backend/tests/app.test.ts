import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const carRecords = { all: vi.fn(), active: vi.fn(), find: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn(), reorder: vi.fn() };
const customerRequests = { create: vi.fn(), all: vi.fn(), update: vi.fn() };
const broadcastSellRequest = vi.fn();
const broadcastContactRequest = vi.fn();
const sendSellRequestEmail = vi.fn();
const sendContactRequestEmail = vi.fn();

vi.mock("../src/config.js", () => ({ config: {
  BACKEND_API_KEY: "test-api-key", TELEGRAM_WEBHOOK_SECRET: "test-webhook-secret",
  FRONTEND_ORIGIN: "http://localhost:3000", DATABASE_URL: "postgres://test:test@localhost/test",
} }));
vi.mock("../src/database.js", () => ({ carRecords, customerRequests, carStatuses: ["draft", "active", "reserved", "sold", "hidden"] }));
vi.mock("../src/telegram.js", () => ({ bot: {}, broadcastSellRequest, broadcastContactRequest }));
vi.mock("../src/email.js", () => ({ sendSellRequestEmail, sendContactRequestEmail }));

const { app } = await import("../src/app.js");

describe("backend API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    carRecords.all.mockResolvedValue([]);
    carRecords.active.mockResolvedValue([]);
    carRecords.find.mockResolvedValue(null);
    carRecords.create.mockImplementation(async (car) => car);
    carRecords.reorder.mockResolvedValue([]);
    customerRequests.create.mockResolvedValue({ id: "request-1" });
    customerRequests.all.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });
    broadcastContactRequest.mockResolvedValue({ recipients: 1, delivered: 1 });
    sendContactRequestEmail.mockResolvedValue(undefined);
  });

  it("reports healthy", async () => {
    await request(app).get("/health").expect(200, { ok: true });
  });

  it("returns catalog records", async () => {
    carRecords.active.mockResolvedValue([{ id: "car-1", brand: "BMW" }]);
    const response = await request(app).get("/api/cars").expect(200);
    expect(response.body.cars).toEqual([{ id: "car-1", brand: "BMW" }]);
  });

  it("does not allow creating cars without the backend key", async () => {
    await request(app).post("/api/admin/cars").send({}).expect(401);
    expect(carRecords.create).not.toHaveBeenCalled();
  });

  it("validates car data before saving", async () => {
    const response = await request(app).post("/api/admin/cars").set("x-api-key", "test-api-key").send({ brand: "BMW" }).expect(400);
    expect(response.body.error).toBe("Validation failed");
    expect(carRecords.create).not.toHaveBeenCalled();
  });

  it("saves a valid car", async () => {
    const payload = { brand: "BMW", model: "X5", price: 5000000, year: 2024, images: ["https://example.com/x5.jpg"], bodyType: "Кроссовер", engine: "Бензин" };
    const response = await request(app).post("/api/admin/cars").set("x-api-key", "test-api-key").send(payload).expect(201);
    expect(response.body.car).toMatchObject(payload);
    expect(carRecords.create).toHaveBeenCalledWith(expect.objectContaining(payload));
  });

  it("saves a draft status with the car", async () => {
    const payload = { brand: "BMW", model: "X5", price: 5000000, year: 2024, images: ["https://example.com/x5.jpg"], bodyType: "Кроссовер", engine: "Бензин", status: "draft" };
    await request(app).post("/api/admin/cars").set("x-api-key", "test-api-key").send(payload).expect(201);
    expect(carRecords.create).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
  });

  it("changes the catalog order only with the backend key", async () => {
    await request(app).put("/api/admin/cars/order").send({ ids: ["car-2", "car-1"] }).expect(401);
    await request(app).put("/api/admin/cars/order").set("x-api-key", "test-api-key").send({ ids: ["car-2", "car-1"] }).expect(200);
    expect(carRecords.reorder).toHaveBeenCalledWith(["car-2", "car-1"]);
  });

  it("loads deleted cars separately", async () => {
    await request(app).get("/api/admin/cars?deleted=true").set("x-api-key", "test-api-key").expect(200);
    expect(carRecords.all).toHaveBeenCalledWith(true);
  });

  it("paginates admin requests", async () => {
    customerRequests.all.mockResolvedValue({ items: [{ id: "request-1" }], total: 51, page: 2, limit: 25 });
    const response = await request(app).get("/api/admin/requests?page=2&limit=25").set("x-api-key", "test-api-key").expect(200);
    expect(customerRequests.all).toHaveBeenCalledWith(2, 25);
    expect(response.body.pagination).toEqual({ page: 2, limit: 25, total: 51 });
  });

  it("soft deletes and restores a car", async () => {
    carRecords.remove.mockResolvedValue({ id: "car-1", deletedAt: new Date().toISOString() });
    carRecords.restore.mockResolvedValue({ id: "car-1" });
    await request(app).delete("/api/admin/cars/car-1").set("x-api-key", "test-api-key").expect(200);
    await request(app).post("/api/admin/cars/car-1/restore").set("x-api-key", "test-api-key").expect(200);
    expect(carRecords.remove).toHaveBeenCalledWith("car-1");
    expect(carRecords.restore).toHaveBeenCalledWith("car-1");
  });

  it("rejects invalid contact requests before delivery", async () => {
    await request(app).post("/api/contact-requests").set("x-api-key", "test-api-key").send({ name: "A", phone: "12" }).expect(400);
    expect(broadcastContactRequest).not.toHaveBeenCalled();
  });

  it("stores a valid contact request before notifying recipients", async () => {
    await request(app).post("/api/contact-requests").set("x-api-key", "test-api-key").send({ name: "Иван", phone: "+79990000000", message: "Нужна консультация" }).expect(201);
    expect(customerRequests.create).toHaveBeenCalledWith(expect.objectContaining({ kind: "contact", photoCount: 0 }));
    expect(broadcastContactRequest).toHaveBeenCalled();
  });
});
