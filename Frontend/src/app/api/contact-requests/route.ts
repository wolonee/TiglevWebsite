export const runtime = "nodejs";

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) {
    console.error("BACKEND_URL or BACKEND_API_KEY is not configured");
    return Response.json({ error: "Сервис заявок временно недоступен" }, { status: 503 });
  }

  try {
    const payload = await request.json();
    const response = await fetch(`${backendUrl}/api/contact-requests`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({ error: "Некорректный ответ backend" }));
    return Response.json(result, { status: response.status });
  } catch (error) {
    console.error("Contact backend request failed:", error);
    return Response.json({ error: "Не удалось отправить заявку" }, { status: 502 });
  }
}
