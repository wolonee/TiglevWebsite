import { revalidateTag } from "next/cache";
import { getAdminAccess } from "@/lib/admin-auth";
import { MESSENGERS_TAG } from "@/data/messengerChannels";

export const runtime = "nodejs";

/**
 * Каналы связи для админки.
 *
 * Ключ бэкенда живёт только здесь: браузер администратора обращается к своему
 * же домену, а наружу с ключом ходит сервер. Тот же приём, что у остальных
 * админских разделов.
 */

async function backend(path: string, init?: RequestInit) {
  const base = process.env.BACKEND_URL;
  const key = process.env.BACKEND_API_KEY;
  if (!base || !key) return null;
  return fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-api-key": key, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
}

async function guard() {
  const access = await getAdminAccess();
  if (!access.userId) return Response.json({ error: "Необходим вход" }, { status: 401 });
  if (!access.isAdmin) return Response.json({ error: "Недостаточно прав" }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  try {
    const response = await backend("/api/admin/messengers");
    if (!response) return Response.json({ error: "Backend не настроен" }, { status: 503 });
    return Response.json(await response.json(), { status: response.status });
  } catch (error) {
    console.error("Messenger channels loading failed:", error);
    return Response.json({ error: "Не удалось загрузить каналы связи" }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  try {
    const response = await backend("/api/admin/messengers", {
      method: "PUT",
      body: JSON.stringify(await request.json()),
    });
    if (!response) return Response.json({ error: "Backend не настроен" }, { status: 503 });
    const result = await response.json().catch(() => ({ error: "Некорректный ответ backend" }));
    // Без сброса кеша выключенная кнопка жила бы на карточках ещё пять минут,
    // и администратор решил бы, что сохранение не сработало.
    if (response.ok) revalidateTag(MESSENGERS_TAG, { expire: 0 });
    return Response.json(result, { status: response.status });
  } catch (error) {
    console.error("Messenger channels saving failed:", error);
    return Response.json({ error: "Не удалось сохранить каналы связи" }, { status: 502 });
  }
}
