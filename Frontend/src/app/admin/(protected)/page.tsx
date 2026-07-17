import type { Metadata } from "next";

export const metadata: Metadata = { title: "Админка — TIGLEV.COM" };

export default function AdminPage() {
  return (
    <section className="rounded-2xl border border-gray-border bg-white p-8 sm:p-10">
      <p className="eyebrow">Панель управления</p>
      <h1 className="mt-3 text-3xl font-bold text-dark">Админка подключена</h1>
      <p className="mt-3 max-w-2xl text-gray-text">
        Аутентификация и проверка роли администратора работают. Разделы управления добавим следующим этапом.
      </p>
    </section>
  );
}
