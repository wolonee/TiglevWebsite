import { getAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const access = await getAdminAccess();
  if (!access.userId) return Response.json({ error: "Необходим вход" }, { status: 401 });
  if (!access.isAdmin) return Response.json({ error: "Недостаточно прав" }, { status: 403 });
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) return Response.json({ error: "Backend не настроен" }, { status: 503 });
  try {
    const response = await fetch(`${backendUrl}/api/admin/cars/order`, {
      method: "PUT", headers: { "content-type": "application/json", "x-api-key": apiKey }, body: JSON.stringify(await request.json()), cache: "no-store",
    });
    return Response.json(await response.json(), { status: response.status });
  } catch (error) {
    console.error("Car order update failed:", error);
    return Response.json({ error: "Не удалось сохранить порядок" }, { status: 502 });
  }
}
