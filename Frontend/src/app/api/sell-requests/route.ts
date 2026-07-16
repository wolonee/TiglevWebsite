export const runtime = "nodejs";

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) {
    console.error("BACKEND_URL or BACKEND_API_KEY is not configured");
    return Response.json({ error: "Сервис заявок временно недоступен" }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const response = await fetch(`${backendUrl}/api/sell-requests`, {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: formData,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({ error: "Некорректный ответ backend" }));
    return Response.json(payload, { status: response.status });
  } catch (error) {
    console.error("Backend request failed:", error);
    return Response.json({ error: "Не удалось отправить заявку" }, { status: 502 });
  }
}
