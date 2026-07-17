import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { ShieldX } from "lucide-react";

export const metadata: Metadata = { title: "Доступ запрещён — TIGLEV.COM" };

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-bg px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-gray-border bg-white p-8 text-center shadow-sm">
        <ShieldX className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-5 text-2xl font-bold text-dark">Нет доступа к админке</h1>
        <p className="mt-3 text-gray-text">Аккаунт успешно авторизован, но у него нет роли администратора.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="rounded-xl border border-gray-border px-5 py-3 text-sm font-semibold text-dark hover:border-primary">На главную</Link>
          <SignOutButton redirectUrl="/admin/sign-in">
            <button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark">Войти другим аккаунтом</button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
