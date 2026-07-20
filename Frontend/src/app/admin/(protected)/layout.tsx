import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";
import { getAdminAccess } from "@/lib/admin-auth";
import AdminNavigation from "@/components/AdminNavigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await getAdminAccess();
  if (!access.userId) redirect("/admin/sign-in");
  if (!access.isAdmin) redirect("/admin/forbidden");

  return (
    <div className="min-h-screen bg-gray-bg">
      <header className="border-b border-gray-border bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/admin/cars" className="flex items-center gap-2 font-bold text-dark">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="hidden md:inline">TIGLEV.COM · Админка</span>
          </Link>
          <div className="flex items-center gap-2"><AdminNavigation /><UserButton /></div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
