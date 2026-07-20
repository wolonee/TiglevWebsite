"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { ArrowDown, ArrowUp, CheckCircle2, ImagePlus, LoaderCircle, X } from "lucide-react";
import { bodyTypes, brands, colors, damageOptions, driveTypes, engineTypes, transmissions, wheelPositions } from "@/data/cars";
import AppSelect from "./AppSelect";

const initialState = {
  brand: "", model: "", price: "", year: String(new Date().getFullYear()), bodyType: "", engine: "",
  description: "", engineVolume: "", power: "", transmission: "", mileage: "", drive: "",
  wheel: "", color: "", damage: "", status: "active",
};

export type ManagedCar = {
  id: string; brand: string; model: string; price: number; year: number; images: string[];
  bodyType: string; engine: string; description?: string; engineVolume?: string; power?: string;
  transmission?: string; mileage?: number; drive?: string; wheel?: string; color?: string; damage?: string;
  status: "draft" | "active" | "reserved" | "sold" | "hidden"; sortOrder: number; deletedAt?: string;
};
type SelectedImage = { id: string; preview: string; file?: File; url?: string };
type AdminCarFormProps = { car?: ManagedCar | null; onSaved?: (car: ManagedCar) => void; onCancel?: () => void };
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 8 * 1024 * 1024;

const formFromCar = (car?: ManagedCar | null) => car ? {
  brand: car.brand, model: car.model, price: String(car.price), year: String(car.year), bodyType: car.bodyType, engine: car.engine,
  description: car.description ?? "", engineVolume: car.engineVolume ?? "", power: car.power ?? "",
  transmission: car.transmission ?? "", mileage: car.mileage == null ? "" : String(car.mileage), drive: car.drive ?? "",
  wheel: car.wheel ?? "", color: car.color ?? "", damage: car.damage ?? "", status: car.status,
} : initialState;
const imagesFromCar = (car?: ManagedCar | null): SelectedImage[] => car?.images.map((url) => ({ id: url, preview: url, url })) ?? [];

export default function AdminCarForm({ car, onSaved, onCancel }: AdminCarFormProps) {
  const [form, setForm] = useState(() => formFromCar(car));
  const [images, setImages] = useState<SelectedImage[]>(() => imagesFromCar(car));
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const imagesRef = useRef(images);
  const field = "w-full rounded-xl border border-gray-border bg-white px-4 py-3 text-sm text-dark outline-none transition-colors focus:border-primary focus:ring-0";
  const set = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }));

  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => () => imagesRef.current.filter((image) => image.file).forEach((image) => URL.revokeObjectURL(image.preview)), []);
  useEffect(() => {
    imagesRef.current.filter((image) => image.file).forEach((image) => URL.revokeObjectURL(image.preview));
    setForm(formFromCar(car)); setImages(imagesFromCar(car)); setStatus("idle"); setMessage(""); setUploadProgress(0);
  }, [car]);

  function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (images.length + selected.length > 20) { setStatus("error"); setMessage("Можно добавить не более 20 фотографий"); return; }
    const invalid = selected.find((file) => !allowedTypes.has(file.type) || file.size > maxFileSize);
    if (invalid) { setStatus("error"); setMessage("Разрешены JPEG, PNG и WebP размером до 8 МБ"); return; }
    setStatus("idle"); setMessage("");
    setImages((current) => [...current, ...selected.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))]);
  }

  function removeImage(id: string) {
    setImages((current) => {
      const removed = current.find((image) => image.id === id); if (removed?.file) URL.revokeObjectURL(removed.preview);
      return current.filter((image) => image.id !== id);
    });
  }

  function moveImage(index: number, direction: number) {
    setImages((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }

  async function submit(event: { preventDefault: () => void }, requestedStatus?: "draft" | "active") {
    event.preventDefault();
    if (!form.brand || !form.bodyType || !form.engine) { setStatus("error"); setMessage("Выберите марку, тип кузова и двигатель"); return; }
    if (!images.length) { setStatus("error"); setMessage("Добавьте хотя бы одну фотографию"); return; }
    setStatus("loading"); setMessage(""); setUploadProgress(0);
    const uploadedUrls: string[] = [];
    try {
      const totalNewImages = images.filter((image) => image.file).length;
      let uploadedCount = 0;
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        if (image.url) { uploadedUrls.push(image.url); continue; }
        if (!image.file) continue;
        const safeName = image.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const blob = await upload(`cars/${crypto.randomUUID()}-${safeName}`, image.file, {
          access: "public", handleUploadUrl: "/api/admin/car-images",
          onUploadProgress: ({ percentage }) => setUploadProgress(totalNewImages ? Math.round(((uploadedCount + percentage / 100) / totalNewImages) * 100) : 100),
        });
        uploadedUrls.push(blob.url);
        uploadedCount += 1;
      }
      const payload = { ...form, status: requestedStatus ?? form.status, price: Number(form.price), year: Number(form.year), mileage: form.mileage ? Number(form.mileage) : undefined, images: uploadedUrls };
      const response = await fetch(car ? `/api/admin/cars/${car.id}` : "/api/admin/cars", { method: car ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось добавить автомобиль");
      images.filter((image) => image.file).forEach((image) => URL.revokeObjectURL(image.preview));
      setStatus("success"); setMessage(car ? "Изменения сохранены" : "Автомобиль добавлен в каталог");
      if (!car) { setForm(initialState); setImages([]); }
      setUploadProgress(0); onSaved?.(result.car);
    } catch (error) {
      const newBlobUrls = uploadedUrls.filter((url) => !images.some((image) => image.url === url));
      if (newBlobUrls.length) await fetch("/api/admin/car-images", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ urls: newBlobUrls }) }).catch(() => undefined);
      setStatus("error"); setMessage(error instanceof Error ? error.message : "Не удалось добавить автомобиль");
    }
  }

  return (
    <form onSubmit={(event) => void submit(event, car ? undefined : "active")} className="space-y-8">
      <section className="rounded-2xl border border-gray-border bg-white p-6 sm:p-8">
        <h2 className="text-xl font-bold text-dark">Основная информация</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2 text-sm font-medium text-dark"><span>Марка *</span><AppSelect searchable searchPlaceholder="Найти марку…" ariaLabel="Марка" placeholder="Выберите марку" clearLabel="Не выбрана" options={brands} value={form.brand} onValueChange={(value) => set("brand", value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Модель *</span><input required className={field} value={form.model} onChange={(e) => set("model", e.target.value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Цена, ₽ *</span><input required min="1" type="number" className={field} value={form.price} onChange={(e) => set("price", e.target.value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Год *</span><input required min="1900" max={new Date().getFullYear() + 1} type="number" className={field} value={form.year} onChange={(e) => set("year", e.target.value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Кузов *</span><AppSelect searchable ariaLabel="Тип кузова" placeholder="Выберите кузов" clearLabel="Не выбран" options={bodyTypes} value={form.bodyType} onValueChange={(value) => set("bodyType", value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Двигатель *</span><AppSelect ariaLabel="Тип двигателя" placeholder="Выберите двигатель" clearLabel="Не выбран" options={engineTypes} value={form.engine} onValueChange={(value) => set("engine", value)} /></label>
          {car && <label className="space-y-2 text-sm font-medium text-dark"><span>Статус</span><AppSelect ariaLabel="Статус автомобиля" placeholder="Выберите статус" options={["Черновик", "Активно", "Забронировано", "Продано", "Скрыто"]} value={({ draft: "Черновик", active: "Активно", reserved: "Забронировано", sold: "Продано", hidden: "Скрыто" } as Record<string, string>)[form.status]} onValueChange={(value) => set("status", ({ "Черновик": "draft", "Активно": "active", "Забронировано": "reserved", "Продано": "sold", "Скрыто": "hidden" } as Record<string, string>)[value] ?? "draft")} /></label>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-border bg-white p-6 sm:p-8">
        <h2 className="text-xl font-bold text-dark">Характеристики</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {([['engineVolume','Объём двигателя'],['power','Мощность'],['mileage','Пробег, км']] as const).map(([name, label]) => <label key={name} className="space-y-2 text-sm font-medium text-dark"><span>{label}</span><input className={field} type={name === "mileage" ? "number" : "text"} value={form[name]} onChange={(e) => set(name, e.target.value)} /></label>)}
          <label className="space-y-2 text-sm font-medium text-dark"><span>Трансмиссия</span><AppSelect ariaLabel="Трансмиссия" placeholder="Выберите трансмиссию" clearLabel="Не выбрана" options={transmissions} value={form.transmission} onValueChange={(value) => set("transmission", value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Привод</span><AppSelect ariaLabel="Привод" placeholder="Выберите привод" clearLabel="Не выбран" options={driveTypes} value={form.drive} onValueChange={(value) => set("drive", value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Руль</span><AppSelect ariaLabel="Положение руля" placeholder="Выберите положение" clearLabel="Не выбрано" options={wheelPositions} value={form.wheel} onValueChange={(value) => set("wheel", value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Цвет</span><AppSelect searchable ariaLabel="Цвет" placeholder="Выберите цвет" clearLabel="Не выбран" options={colors} value={form.color} onValueChange={(value) => set("color", value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Состояние кузова</span><AppSelect ariaLabel="Состояние кузова" placeholder="Выберите состояние" clearLabel="Не выбрано" options={damageOptions} value={form.damage} onValueChange={(value) => set("damage", value)} /></label>
        </div>
        <label className="mt-5 block space-y-2 text-sm font-medium text-dark"><span>Описание</span><textarea rows={5} className={field} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
      </section>

      <section className="rounded-2xl border border-gray-border bg-white p-6 sm:p-8">
        <h2 className="text-xl font-bold text-dark">Фотографии</h2><p className="mt-1 text-sm text-gray-text">JPEG, PNG или WebP, до 8 МБ каждый. Первая фотография станет обложкой.</p>
        {images.length > 0 && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{images.map((image, index) => <div key={image.id} className="overflow-hidden rounded-xl border border-gray-border bg-gray-bg"><div className="relative aspect-[4/3]"><Image src={image.preview} alt={`Фотография ${index + 1}`} fill unoptimized className="object-cover" />{index === 0 && <span className="absolute left-2 top-2 rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-white">Обложка</span>}</div><div className="flex items-center justify-between gap-2 p-2"><span className="min-w-0 truncate text-xs text-gray-text">{image.file?.name ?? `Фото ${index + 1}`}</span><div className="flex shrink-0"><button type="button" disabled={index === 0} onClick={() => moveImage(index, -1)} aria-label="Переместить выше" className="p-1.5 text-gray-text hover:text-primary disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)} aria-label="Переместить ниже" className="p-1.5 text-gray-text hover:text-primary disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => removeImage(image.id)} aria-label="Удалить фотографию" className="p-1.5 text-gray-text hover:text-primary"><X className="h-4 w-4" /></button></div></div></div>)}</div>}
        {images.length < 20 && <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-border px-5 py-8 text-sm font-semibold text-gray-text transition-colors hover:border-primary hover:text-primary"><ImagePlus className="h-5 w-5" />Выбрать фотографии<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={selectImages} /></label>}
      </section>

      {message && <p className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${status === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{status === "success" && <CheckCircle2 className="h-5 w-5" />}{message}</p>}
      <div className="flex flex-wrap gap-3"><button disabled={status === "loading"} className="inline-flex min-w-56 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60">{status === "loading" && <LoaderCircle className="h-5 w-5 animate-spin" />}{status === "loading" ? `Загрузка ${uploadProgress}%` : car ? "Сохранить изменения" : "Опубликовать в каталоге"}</button>{!car && <button type="button" disabled={status === "loading"} onClick={(event) => void submit(event, "draft")} className="rounded-xl border border-gray-border bg-white px-6 py-3.5 font-semibold text-dark hover:border-primary hover:text-primary disabled:opacity-60">Сохранить как черновик</button>}{onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-gray-border bg-white px-6 py-3.5 font-semibold text-dark hover:border-primary hover:text-primary">Отмена</button>}</div>
    </form>
  );
}
