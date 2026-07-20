import { getAdminAccess } from "@/lib/admin-auth";
import { invalidateCatalogCache } from "@/lib/catalog-cache";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await getAdminAccess();
  if (!access.userId) return Response.json({ error: "Необходим вход" }, { status: 401 });
  if (!access.isAdmin) return Response.json({ error: "Недостаточно прав" }, { status: 403 });
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) return Response.json({ error: "Backend не настроен" }, { status: 503 });
  try {
    const deleted = new URL(request.url).searchParams.get("deleted") === "true";
    const response = await fetch(`${backendUrl}/api/admin/cars${deleted ? "?deleted=true" : ""}`, { headers: { "x-api-key": apiKey }, cache: "no-store" });
    return Response.json(await response.json(), { status: response.status });
  } catch (error) {
    console.error("Admin cars loading failed:", error);
    return Response.json({ error: "Не удалось загрузить автомобили" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const access = await getAdminAccess();
  if (!access.userId) return Response.json({ error: "Необходим вход" }, { status: 401 });
  if (!access.isAdmin) return Response.json({ error: "Недостаточно прав" }, { status: 403 });

  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) return Response.json({ error: "Backend не настроен" }, { status: 503 });

  try {
    const response = await fetch(`${backendUrl}/api/admin/cars`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({ error: "Некорректный ответ backend" }));
    if (response.ok) invalidateCatalogCache();
    return Response.json(result, { status: response.status });
  } catch (error) {
    console.error("Admin car creation failed:", error);
    return Response.json({ error: "Не удалось добавить автомобиль" }, { status: 502 });
  }
}
