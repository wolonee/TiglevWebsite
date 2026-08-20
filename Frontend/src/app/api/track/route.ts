import { NextResponse } from "next/server";

/**
 * Приём событий счётчика и передача их бэкенду.
 *
 * Зачем прослойка, а не запрос из браузера прямо в бэкенд: иначе адрес бэкенда
 * попадает в клиентский код, нужен CORS, а блокировщики рекламы охотнее режут
 * запросы на посторонний домен, чем на свой же `/api/track`.
 *
 * Заголовок `user-agent` передаём дальше — по нему бэкенд отсеивает роботов
 * и определяет тип устройства.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const base = process.env.BACKEND_URL;
  // Молча соглашаемся: счётчик не должен шуметь в консоли у посетителя.
  if (!base) return new NextResponse(null, { status: 204 });

  try {
    const body = await request.text();
    await fetch(`${base}/api/analytics/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": request.headers.get("user-agent") ?? "",
      },
      body,
      cache: "no-store",
    });
  } catch {
    // Недоступный бэкенд не повод показывать посетителю ошибку.
  }
  return new NextResponse(null, { status: 204 });
}
