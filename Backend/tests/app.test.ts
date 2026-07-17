import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const carRecords = { all: vi.fn(), find: vi.fn(), create: vi.fn() };
const broadcastSellRequest = vi.fn();
const broadcastContactRequest = vi.fn();
const sendSellRequestEmail = vi.fn();
const sendContactRequestEmail = vi.fn();

vi.mock("../src/config.js", () => ({ config: {
  BACKEND_API_KEY: "test-api-key", TELEGRAM_WEBHOOK_SECRET: "test-webhook-secret",
  FRONTEND_ORIGIN: "http://localhost:3000", DATABASE_URL: "postgres://test:test@localhost/test",
} }));
vi.mock("../src/database.js", () => ({ carRecords }));
vi.mock("../src/telegram.js", () => ({ bot: {}, broadcastSellRequest, broadcastContactRequest }));
vi.mock("../src/email.js", () => ({ sendSellRequestEmail, sendContactRequestEmail }));

const { app } = await import("../src/app.js");

describe("backend API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    carRecords.all.mockResolvedValue([]);
    carRecords.find.mockResolvedValue(null);
    carRecords.create.mockImplementation(async (car) => car);
    broadcastContactRequest.mockResolvedValue({ recipients: 1, delivered: 1 });
    sendContactRequestEmail.mockResolvedValue(undefined);
  });

  it("reports healthy", async () => {
    await request(app).get("/health").expect(200, { ok: true });
  });

  it("returns catalog records", async () => {
    carRecords.all.mockResolvedValue([{ id: "car-1", brand: "BMW" }]);
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

  it("rejects invalid contact requests before delivery", async () => {
    await request(app).post("/api/contact-requests").set("x-api-key", "test-api-key").send({ name: "A", phone: "12" }).expect(400);
    expect(broadcastContactRequest).not.toHaveBeenCalled();
  });
});
