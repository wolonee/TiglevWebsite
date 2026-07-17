import { getAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  const access = await getAdminAccess();
  if (!access.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!access.isAdmin) return Response.json({ error: "Forbidden" }, { status: 403 });

  return Response.json({
    user: {
      id: access.user.id,
      email: access.user.primaryEmailAddress?.emailAddress ?? null,
    },
  });
}
