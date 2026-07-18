import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { CarFront, MessageSquare, ShieldCheck } from "lucide-react";
import { getAdminAccess } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await getAdminAccess();
  if (!access.userId) redirect("/admin/sign-in");
  if (!access.isAdmin) redirect("/admin/forbidden");

  return (
    <div className="min-h-screen bg-gray-bg">
      <header className="border-b border-gray-border bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-dark">
            <ShieldCheck className="h-5 w-5 text-primary" />
            TIGLEV.COM · Админка
          </Link>
          <div className="flex items-center gap-3"><nav className="hidden items-center gap-1 sm:flex"><Link href="/admin" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-text hover:bg-gray-bg hover:text-dark"><CarFront className="h-4 w-4" />Автомобили</Link><Link href="/admin/requests" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-text hover:bg-gray-bg hover:text-dark"><MessageSquare className="h-4 w-4" />Заявки</Link></nav><UserButton /></div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
