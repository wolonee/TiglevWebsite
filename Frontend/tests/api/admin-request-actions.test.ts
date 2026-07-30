import { beforeEach, describe, expect, it, vi } from "vitest";

const getAdminAccess = vi.fn();

vi.mock("@/lib/admin-auth", () => ({ getAdminAccess }));

const { GET, PATCH } = await import("@/app/api/admin/requests/[id]/route");
const context = { params: Promise.resolve({ id: "request 1" }) };

describe("admin request actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.BACKEND_URL = "https://backend.example.com";
    process.env.BACKEND_API_KEY = "private-key";
    getAdminAccess.mockResolvedValue({ userId: "admin_1", isAdmin: true });
  });

  it("forwards an administrator note to the private backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ request: { id: "request 1", note: "Перезвонить" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await PATCH(new Request("http://localhost/api/admin/requests/request%201", {
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress", note: "Перезвонить" }),
    }), context);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/admin/requests/request%201",
      expect.objectContaining({
        method: "PATCH",
        headers: { "content-type": "application/json", "x-api-key": "private-key" },
        body: JSON.stringify({ status: "in_progress", note: "Перезвонить" }),
      }),
    );
  });

  it("loads a request from the private backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      request: { id: "request 1", note: "Перезвонить", photoUrls: ["https://example.com/car.jpg"] },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new Request("http://localhost/api/admin/requests/request%201"), context);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/admin/requests/request%201",
      expect.objectContaining({ headers: { "x-api-key": "private-key" }, cache: "no-store" }),
    );
  });
});
