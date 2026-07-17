import { del } from "@vercel/blob";
import { getAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

async function authorize() {
  const access = await getAdminAccess();
  if (!access.userId) return Response.json({ error: "Необходим вход" }, { status: 401 });
  if (!access.isAdmin) return Response.json({ error: "Недостаточно прав" }, { status: 403 });
  return null;
}

function blobUrls(urls: unknown) {
  return Array.isArray(urls) ? urls.filter((url): url is string => {
    if (typeof url !== "string") return false;
    try { return new URL(url).hostname.endsWith(".blob.vercel-storage.com"); } catch { return false; }
  }) : [];
}

async function backendRequest(id: string, method: "PATCH" | "DELETE", body?: unknown) {
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) return Response.json({ error: "Backend не настроен" }, { status: 503 });
  try {
    const response = await fetch(`${backendUrl}/api/admin/cars/${encodeURIComponent(id)}`, {
      method, headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store",
    });
    const result = await response.json().catch(() => ({ error: "Некорректный ответ backend" }));
    if (response.ok) {
      const staleImages = method === "DELETE" ? blobUrls(result.car?.images) : blobUrls(result.removedImages);
      if (staleImages.length) await del(staleImages).catch((error) => console.error("Blob cleanup failed:", error));
    }
    return Response.json(result, { status: response.status });
  } catch (error) {
    console.error(`Admin car ${method.toLowerCase()} failed:`, error);
    return Response.json({ error: "Не удалось изменить автомобиль" }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await authorize(); if (denied) return denied;
  const { id } = await context.params;
  return backendRequest(id, "PATCH", await request.json());
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await authorize(); if (denied) return denied;
  const { id } = await context.params;
  return backendRequest(id, "DELETE");
}
