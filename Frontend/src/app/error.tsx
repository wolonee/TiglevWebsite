"use client";

import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-gray-bg px-4 py-10">
      <section role="alert" className="w-full max-w-lg rounded-2xl border border-gray-border bg-white p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><TriangleAlert className="h-6 w-6" /></div>
        <h1 className="mt-5 text-2xl font-bold text-dark">Не удалось открыть страницу</h1>
        <p className="mt-3 leading-relaxed text-gray-text">Попробуйте обновить страницу. Если ошибка повторится, свяжитесь с нами по телефону.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-dark"><RefreshCw className="h-4 w-4" />Повторить</button>
          <Link href="/" className="inline-flex items-center justify-center rounded-xl border border-gray-border px-5 py-3 font-semibold text-dark hover:border-primary hover:text-primary">На главную</Link>
        </div>
      </section>
    </main>
  );
}
