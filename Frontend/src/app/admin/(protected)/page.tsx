import type { Metadata } from "next";
import AdminCarForm from "@/components/AdminCarForm";

export const metadata: Metadata = { title: "Админка — TIGLEV.COM" };

export default function AdminPage() {
  return (
    <div>
      <p className="eyebrow">Панель управления</p>
      <h1 className="mt-3 text-3xl font-bold text-dark">Добавить автомобиль</h1>
      <p className="mb-8 mt-3 max-w-2xl text-gray-text">Заполните карточку автомобиля. После сохранения она сразу появится в каталоге.</p>
      <AdminCarForm />
    </div>
  );
}
