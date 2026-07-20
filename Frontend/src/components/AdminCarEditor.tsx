"use client";

import { useRouter } from "next/navigation";
import AdminCarForm, { type ManagedCar } from "./AdminCarForm";

export default function AdminCarEditor({ car }: { car?: ManagedCar }) {
  const router = useRouter();
  const close = () => router.push("/admin/cars");

  return (
    <section>
      <div className="mb-6">
        <p className="eyebrow">{car ? "Редактирование" : "Новый товар"}</p>
        <h1 className="mt-3 text-3xl font-bold text-dark">
          {car ? `${car.brand} ${car.model}` : "Добавить автомобиль"}
        </h1>
      </div>
      <AdminCarForm car={car} onSaved={close} onCancel={close} />
    </section>
  );
}
