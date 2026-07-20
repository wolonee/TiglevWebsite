"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, LoaderCircle, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import { brands, formatPrice } from "@/data/cars";
import type { ManagedCar } from "./AdminCarForm";
import AppSelect from "./AppSelect";
import ConfirmDialog from "./ConfirmDialog";

const statusLabel: Record<ManagedCar["status"], string> = {
  draft: "Черновик",
  active: "Активно",
  reserved: "Забронировано",
  sold: "Продано",
  hidden: "Скрыто",
};

const statusColor: Record<ManagedCar["status"], string> = {
  draft: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  reserved: "bg-sky-100 text-sky-800",
  sold: "bg-violet-100 text-violet-800",
  hidden: "bg-slate-200 text-slate-700",
};

export default function AdminCarManager() {
  const [cars, setCars] = useState<ManagedCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const [error, setError] = useState("");
  const [trash, setTrash] = useState(false);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [carToRemove, setCarToRemove] = useState<ManagedCar | null>(null);

  const loadCars = useCallback(async () => {
    setLoading(true);
    setError("");
    setOrderChanged(false);
    try {
      const response = await fetch(`/api/admin/cars${trash ? "?deleted=true" : ""}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось загрузить каталог");
      setCars(result.cars ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить каталог");
    } finally {
      setLoading(false);
    }
  }, [trash]);

  useEffect(() => { void loadCars(); }, [loadCars]);

  const visibleCars = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru-RU");
    return cars.filter((car) => (
      (!query || `${car.brand} ${car.model} ${car.year}`.toLocaleLowerCase("ru-RU").includes(query))
      && (!brand || car.brand === brand)
      && (!status || car.status === status)
    ));
  }, [brand, cars, search, status]);

  const filtersActive = Boolean(search || brand || status);
  const orderingEnabled = !trash && !filtersActive;

  async function remove(car: ManagedCar) {
    setCarToRemove(null);
    setWorkingId(car.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/cars/${car.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось удалить автомобиль");
      setCars((current) => current.filter((item) => item.id !== car.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить автомобиль");
    } finally {
      setWorkingId(null);
    }
  }

  async function restore(car: ManagedCar) {
    setWorkingId(car.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/cars/${car.id}/restore`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось восстановить автомобиль");
      setCars((current) => current.filter((item) => item.id !== car.id));
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Не удалось восстановить автомобиль");
    } finally {
      setWorkingId(null);
    }
  }

  function move(carId: string, direction: number) {
    const index = cars.findIndex((car) => car.id === carId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= cars.length) return;
    const next = [...cars];
    [next[index], next[target]] = [next[target], next[index]];
    const update = () => setCars(next);
    const documentWithTransitions = document as Document & { startViewTransition?: (callback: () => void) => void };
    if (documentWithTransitions.startViewTransition) documentWithTransitions.startViewTransition(update);
    else update();
    setOrderChanged(true);
  }

  async function saveOrder() {
    setSavingOrder(true);
    setError("");
    try {
      const response = await fetch("/api/admin/cars/order", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: cars.map((car) => car.id) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось сохранить порядок");
      setCars(result.cars);
      setOrderChanged(false);
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : "Не удалось сохранить порядок");
      void loadCars();
    } finally {
      setSavingOrder(false);
    }
  }

  return (
    <>
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Каталог</p>
          <h1 className="mt-3 text-3xl font-bold text-dark">{trash ? "Корзина" : "Автомобили"}</h1>
          <p className="mt-2 text-gray-text">Показано {visibleCars.length} из {cars.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void loadCars()} className="rounded-xl border border-gray-border bg-white p-3 text-gray-text hover:border-primary hover:text-primary" aria-label="Обновить список">
            <RefreshCw className="h-5 w-5" />
          </button>
          {orderChanged && <button type="button" disabled={savingOrder} onClick={() => void saveOrder()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-60">{savingOrder && <LoaderCircle className="h-5 w-5 animate-spin" />}Сохранить порядок</button>}
          <button type="button" onClick={() => setTrash((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-gray-border bg-white px-5 py-3 font-semibold text-dark hover:border-primary hover:text-primary">
            {trash ? <RotateCcw className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}{trash ? "К каталогу" : "Корзина"}
          </button>
          {!trash && <Link href="/admin/cars/new" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary-dark"><Plus className="h-5 w-5" />Добавить автомобиль</Link>}
        </div>
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-gray-border bg-white p-4 md:grid-cols-[1fr_220px_220px_auto]">
        <label className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Марка, модель или год" className="w-full rounded-xl border border-gray-border py-3 pl-11 pr-4 text-sm outline-none focus:border-primary" /></label>
        <AppSelect ariaLabel="Фильтр по марке" searchable searchPlaceholder="Найти марку…" placeholder="Все марки" clearLabel="Все марки" options={brands} value={brand} onValueChange={setBrand} />
        <AppSelect ariaLabel="Фильтр по статусу" placeholder="Все статусы" clearLabel="Все статусы" options={Object.values(statusLabel)} value={status ? statusLabel[status as ManagedCar["status"]] : ""} onValueChange={(value) => setStatus(Object.entries(statusLabel).find(([, label]) => label === value)?.[0] ?? "")} />
        {filtersActive && <button type="button" onClick={() => { setSearch(""); setBrand(""); setStatus(""); }} className="rounded-xl border border-gray-border px-4 py-3 text-sm font-semibold text-dark hover:border-primary hover:text-primary">Сбросить</button>}
      </div>

      {error && <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-text"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Загружаем каталог…</div>
      ) : visibleCars.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-border bg-white py-16 text-center text-gray-text">{filtersActive ? "По заданным условиям ничего не найдено" : trash ? "Корзина пуста" : "В каталоге пока нет автомобилей"}</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCars.map((car) => {
            const index = cars.findIndex((item) => item.id === car.id);
            return (
              <article key={car.id} style={{ viewTransitionName: `admin-car-${car.id}` }} className="overflow-hidden rounded-2xl border border-gray-border bg-white transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative aspect-[16/10] bg-gray-bg">
                  <Image src={car.images[0]} alt={`${car.brand} ${car.model}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                  <span className={`absolute left-3 top-3 rounded-lg px-2.5 py-1 text-xs font-semibold ${trash ? "bg-red-100 text-red-700" : statusColor[car.status]}`}>{trash ? "Удалено" : statusLabel[car.status]}</span>
                </div>
                <div className="p-5">
                  <p className="text-xs text-gray-text">{car.year} · {car.bodyType}</p>
                  <h2 className="mt-1 text-lg font-bold text-dark">{car.brand} {car.model}</h2>
                  <p className="mt-2 text-xl font-extrabold text-primary">{formatPrice(car.price)}</p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {trash ? (
                      <button type="button" disabled={workingId === car.id} onClick={() => void restore(car)} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 px-3 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"><RotateCcw className="h-4 w-4" />Восстановить</button>
                    ) : (
                      <>
                        <Link href={`/admin/cars/${car.id}/edit`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-border px-3 py-2.5 text-sm font-semibold text-dark hover:border-primary hover:text-primary"><Pencil className="h-4 w-4" />Редактировать</Link>
                        <Link href={`/admin/preview/${car.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-border px-3 py-2.5 text-sm font-semibold text-dark hover:border-primary hover:text-primary"><Eye className="h-4 w-4" />Просмотр</Link>
                        {orderingEnabled && <><button type="button" disabled={savingOrder || index === 0} onClick={() => move(car.id, -1)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-border px-3 py-2.5 text-sm font-semibold text-dark disabled:opacity-40"><ArrowUp className="h-4 w-4" />Выше</button><button type="button" disabled={savingOrder || index === cars.length - 1} onClick={() => move(car.id, 1)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-border px-3 py-2.5 text-sm font-semibold text-dark disabled:opacity-40"><ArrowDown className="h-4 w-4" />Ниже</button></>}
                        <button type="button" disabled={workingId === car.id} onClick={() => setCarToRemove(car)} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />В корзину</button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
    <ConfirmDialog open={Boolean(carToRemove)} title="Переместить автомобиль в корзину?" description={carToRemove ? `${carToRemove.brand} ${carToRemove.model} исчезнет из каталога. Автомобиль можно будет восстановить.` : ""} confirmLabel="В корзину" onCancel={() => setCarToRemove(null)} onConfirm={() => { if (carToRemove) void remove(carToRemove); }} />
    </>
  );
}
