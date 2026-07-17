import { auth, clerkClient } from "@clerk/nextjs/server";

export async function getAdminAccess() {
  const { userId } = await auth();
  if (!userId) return { userId: null, user: null, isAdmin: false } as const;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return {
    userId,
    user,
    isAdmin: user.privateMetadata.role === "admin",
  } as const;
}
