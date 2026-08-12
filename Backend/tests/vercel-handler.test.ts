import { beforeEach, describe, expect, it, vi } from "vitest";

const app = vi.fn();
const migrateDatabase = vi.fn();

vi.mock("../src/app.js", () => ({ default: app }));
vi.mock("../src/database.js", () => ({ migrateDatabase }));

const { default: handler } = await import("../api/index.js");

describe("Vercel backend handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    migrateDatabase.mockResolvedValue(undefined);
  });

  it("runs database migrations before handling a request", async () => {
    const request = {} as never;
    const response = {} as never;

    await handler(request, response);

    expect(migrateDatabase).toHaveBeenCalledOnce();
    expect(app).toHaveBeenCalledWith(request, response);
    expect(migrateDatabase.mock.invocationCallOrder[0]).toBeLessThan(app.mock.invocationCallOrder[0]);
  });

  it("returns a server error when database initialization fails", async () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    migrateDatabase.mockRejectedValue(new Error("database unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await handler({} as never, { status } as never);

    expect(app).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: "Database initialization failed" });
  });
});
