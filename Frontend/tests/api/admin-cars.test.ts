import { beforeEach, describe, expect, it, vi } from "vitest";

const getAdminAccess = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ getAdminAccess }));

const { POST } = await import("@/app/api/admin/cars/route");

describe("POST /api/admin/cars", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.BACKEND_URL;
    delete process.env.BACKEND_API_KEY;
  });

  it("rejects unauthenticated users", async () => {
    getAdminAccess.mockResolvedValue({ userId: null, isAdmin: false });
    expect((await POST(new Request("http://localhost/api/admin/cars", { method: "POST" }))).status).toBe(401);
  });

  it("rejects regular users", async () => {
    getAdminAccess.mockResolvedValue({ userId: "user_1", isAdmin: false });
    expect((await POST(new Request("http://localhost/api/admin/cars", { method: "POST" }))).status).toBe(403);
  });

  it("forwards an admin request only with the private backend key", async () => {
    getAdminAccess.mockResolvedValue({ userId: "admin_1", isAdmin: true });
    process.env.BACKEND_URL = "https://backend.example.com";
    process.env.BACKEND_API_KEY = "private-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ car: { id: "new-car" } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(new Request("http://localhost/api/admin/cars", { method: "POST", body: JSON.stringify({ brand: "BMW" }) }));
    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith("https://backend.example.com/api/admin/cars", expect.objectContaining({ headers: expect.objectContaining({ "x-api-key": "private-key" }) }));
  });
});
