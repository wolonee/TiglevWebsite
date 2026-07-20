import { getAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await getAdminAccess();
  if (!access.userId) return Response.json({ error: "Необходим вход" }, { status: 401 });
  if (!access.isAdmin) return Response.json({ error: "Недостаточно прав" }, { status: 403 });
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) return Response.json({ error: "Backend не настроен" }, { status: 503 });
  const searchParams = new URL(request.url).searchParams;
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "50";
  const response = await fetch(`${backendUrl}/api/admin/requests?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`, { headers: { "x-api-key": apiKey }, cache: "no-store" });
  return Response.json(await response.json(), { status: response.status });
}
