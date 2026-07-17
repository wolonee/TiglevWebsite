"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { formatPrice } from "@/data/cars";
import AdminCarForm, { type ManagedCar } from "./AdminCarForm";

export default function AdminCarManager() {
  const [cars, setCars] = useState<ManagedCar[]>([]);
  const [editing, setEditing] = useState<ManagedCar | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadCars = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/cars", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось загрузить каталог");
      setCars(result.cars ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить каталог");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadCars(); }, [loadCars]);

  function openCreate() { setEditing(null); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openEdit(car: ManagedCar) { setEditing(car); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function saved(car: ManagedCar) {
    setCars((current) => current.some((item) => item.id === car.id) ? current.map((item) => item.id === car.id ? car : item) : [car, ...current]);
    setEditing(null); setShowForm(false);
  }

  async function remove(car: ManagedCar) {
    if (!window.confirm(`Удалить ${car.brand} ${car.model}? Это действие нельзя отменить.`)) return;
    setDeletingId(car.id); setError("");
    try {
      const response = await fetch(`/api/admin/cars/${car.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось удалить автомобиль");
      setCars((current) => current.filter((item) => item.id !== car.id));
      if (editing?.id === car.id) { setEditing(null); setShowForm(false); }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить автомобиль");
    } finally { setDeletingId(null); }
  }

  return (
    <div className="space-y-10">
      {showForm && <section><div className="mb-6"><p className="eyebrow">{editing ? "Редактирование" : "Новый товар"}</p><h1 className="mt-3 text-3xl font-bold text-dark">{editing ? `${editing.brand} ${editing.model}` : "Добавить автомобиль"}</h1></div><AdminCarForm car={editing} onSaved={saved} onCancel={() => { setEditing(null); setShowForm(false); }} /></section>}

      <section className={showForm ? "border-t border-gray-border pt-10" : ""}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Каталог</p><h1 className="mt-3 text-3xl font-bold text-dark">Автомобили</h1><p className="mt-2 text-gray-text">{cars.length} товаров в каталоге</p></div><div className="flex gap-2"><button type="button" onClick={() => void loadCars()} className="rounded-xl border border-gray-border bg-white p-3 text-gray-text hover:border-primary hover:text-primary" aria-label="Обновить список"><RefreshCw className="h-5 w-5" /></button><button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary-dark"><Plus className="h-5 w-5" />Добавить автомобиль</button></div></div>
        {error && <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading ? <div className="flex items-center justify-center py-20 text-gray-text"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Загружаем каталог…</div> : cars.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-border bg-white py-16 text-center text-gray-text">В каталоге пока нет автомобилей</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{cars.map((car) => <article key={car.id} className="overflow-hidden rounded-2xl border border-gray-border bg-white"><div className="relative aspect-[16/10] bg-gray-bg"><Image src={car.images[0]} alt={`${car.brand} ${car.model}`} fill unoptimized className="object-cover" /></div><div className="p-5"><p className="text-xs text-gray-text">{car.year} · {car.bodyType}</p><h2 className="mt-1 text-lg font-bold text-dark">{car.brand} {car.model}</h2><p className="mt-2 text-xl font-extrabold text-primary">{formatPrice(car.price)}</p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => openEdit(car)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-border px-3 py-2.5 text-sm font-semibold text-dark hover:border-primary hover:text-primary"><Pencil className="h-4 w-4" />Редактировать</button><button type="button" disabled={deletingId === car.id} onClick={() => void remove(car)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">{deletingId === car.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Удалить</button></div></div></article>)}</div>}
      </section>
    </div>
  );
}
