import { beforeEach, describe, expect, it, vi } from "vitest";

const getAdminAccess = vi.fn();
const deleteBlobs = vi.fn();

vi.mock("@/lib/admin-auth", () => ({ getAdminAccess }));
vi.mock("@vercel/blob", () => ({ del: deleteBlobs }));

const { DELETE, PATCH } = await import("@/app/api/admin/cars/[id]/route");
const { POST: RESTORE } = await import("@/app/api/admin/cars/[id]/restore/route");

const context = { params: Promise.resolve({ id: "car 1" }) };

describe("admin car actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.BACKEND_URL = "https://backend.example.com";
    process.env.BACKEND_API_KEY = "private-key";
    getAdminAccess.mockResolvedValue({ userId: "admin_1", isAdmin: true });
    deleteBlobs.mockResolvedValue(undefined);
  });

  it("rejects an unauthenticated delete request", async () => {
    getAdminAccess.mockResolvedValue({ userId: null, isAdmin: false });
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);

    expect((await DELETE(new Request("http://localhost/api/admin/cars/car%201", { method: "DELETE" }), context)).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("soft deletes a car without removing its Blob images", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ car: { id: "car 1", images: ["https://store.public.blob.vercel-storage.com/car.jpg"] } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect((await DELETE(new Request("http://localhost/api/admin/cars/car%201", { method: "DELETE" }), context)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("https://backend.example.com/api/admin/cars/car%201", expect.objectContaining({ method: "DELETE", headers: expect.objectContaining({ "x-api-key": "private-key" }) }));
    expect(deleteBlobs).not.toHaveBeenCalled();
  });

  it("removes only obsolete Vercel Blob images after editing", async () => {
    const blobUrl = "https://store.public.blob.vercel-storage.com/old.jpg";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ car: { id: "car 1" }, removedImages: [blobUrl, "https://example.com/external.jpg"] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await PATCH(new Request("http://localhost/api/admin/cars/car%201", { method: "PATCH", body: JSON.stringify({ brand: "BMW" }) }), context);
    expect(response.status).toBe(200);
    expect(deleteBlobs).toHaveBeenCalledWith([blobUrl]);
  });

  it("forwards restore requests to the private backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ car: { id: "car 1" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect((await RESTORE(new Request("http://localhost/api/admin/cars/car%201/restore", { method: "POST" }), context)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("https://backend.example.com/api/admin/cars/car%201/restore", expect.objectContaining({ method: "POST", headers: { "x-api-key": "private-key" } }));
  });

});
