import { del, put } from "@vercel/blob";

export const runtime = "nodejs";

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 100) || "photo.jpg";
}

async function uploadRequestPhotos(formData: FormData) {
  const files = formData.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return [];

  const uploadedUrls: string[] = [];
  try {
    for (const file of files) {
      if (!file.type.startsWith("image/")) throw new Error("Unsupported file type");
      const blob = await put(`requests/${crypto.randomUUID()}-${safeFilename(file.name)}`, file, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      uploadedUrls.push(blob.url);
    }
    return uploadedUrls;
  } catch (error) {
    if (uploadedUrls.length) await del(uploadedUrls).catch((cleanupError) => console.error("Request photo cleanup failed:", cleanupError));
    throw error;
  }
}

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) {
    console.error("BACKEND_URL or BACKEND_API_KEY is not configured");
    return Response.json({ error: "Сервис заявок временно недоступен" }, { status: 503 });
  }

  let photoUrls: string[] = [];
  try {
    const formData = await request.formData();
    photoUrls = await uploadRequestPhotos(formData);
    formData.set("photoUrls", JSON.stringify(photoUrls));
    const response = await fetch(`${backendUrl}/api/sell-requests`, {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: formData,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({ error: "Некорректный ответ backend" }));
    if (!response.ok && photoUrls.length) await del(photoUrls).catch((cleanupError) => console.error("Request photo cleanup failed:", cleanupError));
    return Response.json(payload, { status: response.status });
  } catch (error) {
    if (photoUrls.length) await del(photoUrls).catch((cleanupError) => console.error("Request photo cleanup failed:", cleanupError));
    console.error("Backend request failed:", error);
    return Response.json({ error: "Не удалось отправить заявку" }, { status: 502 });
  }
}
