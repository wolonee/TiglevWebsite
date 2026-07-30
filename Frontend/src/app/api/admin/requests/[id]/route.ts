import { getAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

async function getBackendSettings() {
  const access = await getAdminAccess();
  if (!access.userId) return { error: Response.json({ error: "Необходим вход" }, { status: 401 }) };
  if (!access.isAdmin) return { error: Response.json({ error: "Недостаточно прав" }, { status: 403 }) };
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) return { error: Response.json({ error: "Backend не настроен" }, { status: 503 }) };
  return { backendUrl, apiKey };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const settings = await getBackendSettings();
  if ("error" in settings) return settings.error;
  const { id } = await context.params;
  try {
    const response = await fetch(`${settings.backendUrl}/api/admin/requests/${encodeURIComponent(id)}`, {
      headers: { "x-api-key": settings.apiKey },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({ error: "Некорректный ответ backend" }));
    return Response.json(payload, { status: response.status });
  } catch (error) {
    console.error("Admin request load failed:", error);
    return Response.json({ error: "Не удалось загрузить заявку" }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const settings = await getBackendSettings();
  if ("error" in settings) return settings.error;
  const { id } = await context.params;
  try {
    const response = await fetch(`${settings.backendUrl}/api/admin/requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-api-key": settings.apiKey },
      body: JSON.stringify(await request.json()),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({ error: "Некорректный ответ backend" }));
    return Response.json(payload, { status: response.status });
  } catch (error) {
    console.error("Admin request update failed:", error);
    return Response.json({ error: "Не удалось сохранить заявку" }, { status: 502 });
  }
}
