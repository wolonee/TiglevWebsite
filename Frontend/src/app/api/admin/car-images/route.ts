import { del } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

async function authorizeAdmin() {
  const access = await getAdminAccess();
  if (!access.userId) return { error: "Необходим вход", status: 401 } as const;
  if (!access.isAdmin) return { error: "Недостаточно прав", status: 403 } as const;
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const denied = await authorizeAdmin();
        if (denied) throw new Error(denied.error);
        if (!pathname.startsWith("cars/")) throw new Error("Недопустимый путь файла");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ type: "car-image" }),
        };
      },
      onUploadCompleted: async () => undefined,
    });
    return Response.json(result);
  } catch (error) {
    console.error("Car image upload failed:", error);
    return Response.json({ error: "Не удалось загрузить фотографию" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const denied = await authorizeAdmin();
  if (denied) return Response.json({ error: denied.error }, { status: denied.status });

  const payload = await request.json().catch(() => null) as { urls?: string[] } | null;
  const urls = payload?.urls?.filter((url) => {
    try { return new URL(url).hostname.endsWith(".blob.vercel-storage.com"); } catch { return false; }
  }) ?? [];
  if (!urls.length) return Response.json({ ok: true });

  await del(urls);
  return Response.json({ ok: true });
}
