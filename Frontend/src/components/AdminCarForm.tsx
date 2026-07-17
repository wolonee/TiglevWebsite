"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { ArrowDown, ArrowUp, CheckCircle2, ImagePlus, LoaderCircle, X } from "lucide-react";
import { bodyTypes, brands } from "@/data/cars";
import AppSelect from "./AppSelect";

const initialState = {
  brand: "", model: "", price: "", year: String(new Date().getFullYear()), bodyType: "", engine: "",
  description: "", engineVolume: "", power: "", transmission: "", mileage: "", drive: "",
  wheel: "", color: "", damage: "",
};

type SelectedImage = { id: string; file: File; preview: string };
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 8 * 1024 * 1024;

export default function AdminCarForm() {
  const [form, setForm] = useState(initialState);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const imagesRef = useRef(images);
  const field = "w-full rounded-xl border border-gray-border bg-white px-4 py-3 text-sm text-dark outline-none transition-colors focus:border-primary focus:ring-0";
  const set = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }));

  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview)), []);

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
      const removed = current.find((image) => image.id === id); if (removed) URL.revokeObjectURL(removed.preview);
      return current.filter((image) => image.id !== id);
    });
  }

  function moveImage(index: number, direction: number) {
    setImages((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.brand || !form.bodyType) { setStatus("error"); setMessage("Выберите марку и тип кузова"); return; }
    if (!images.length) { setStatus("error"); setMessage("Добавьте хотя бы одну фотографию"); return; }
    setStatus("loading"); setMessage(""); setUploadProgress(0);
    const uploadedUrls: string[] = [];
    try {
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        const safeName = image.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const blob = await upload(`cars/${crypto.randomUUID()}-${safeName}`, image.file, {
          access: "public", handleUploadUrl: "/api/admin/car-images",
          onUploadProgress: ({ percentage }) => setUploadProgress(Math.round(((index + percentage / 100) / images.length) * 100)),
        });
        uploadedUrls.push(blob.url);
      }
      const payload = { ...form, price: Number(form.price), year: Number(form.year), mileage: form.mileage ? Number(form.mileage) : undefined, images: uploadedUrls };
      const response = await fetch("/api/admin/cars", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось добавить автомобиль");
      images.forEach((image) => URL.revokeObjectURL(image.preview));
      setStatus("success"); setMessage("Автомобиль добавлен в каталог"); setForm(initialState); setImages([]); setUploadProgress(0);
    } catch (error) {
      if (uploadedUrls.length) await fetch("/api/admin/car-images", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ urls: uploadedUrls }) }).catch(() => undefined);
      setStatus("error"); setMessage(error instanceof Error ? error.message : "Не удалось добавить автомобиль");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="rounded-2xl border border-gray-border bg-white p-6 sm:p-8">
        <h2 className="text-xl font-bold text-dark">Основная информация</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2 text-sm font-medium text-dark"><span>Марка *</span><AppSelect ariaLabel="Марка" placeholder="Выберите марку" clearLabel="Не выбрана" options={brands} value={form.brand} onValueChange={(value) => set("brand", value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Модель *</span><input required className={field} value={form.model} onChange={(e) => set("model", e.target.value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Цена, ₽ *</span><input required min="1" type="number" className={field} value={form.price} onChange={(e) => set("price", e.target.value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Год *</span><input required min="1900" max={new Date().getFullYear() + 1} type="number" className={field} value={form.year} onChange={(e) => set("year", e.target.value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Кузов *</span><AppSelect ariaLabel="Тип кузова" placeholder="Выберите кузов" clearLabel="Не выбран" options={bodyTypes} value={form.bodyType} onValueChange={(value) => set("bodyType", value)} /></label>
          <label className="space-y-2 text-sm font-medium text-dark"><span>Двигатель *</span><input required className={field} placeholder="Бензин" value={form.engine} onChange={(e) => set("engine", e.target.value)} /></label>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-border bg-white p-6 sm:p-8">
        <h2 className="text-xl font-bold text-dark">Характеристики</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {([['engineVolume','Объём двигателя'],['power','Мощность'],['transmission','Трансмиссия'],['mileage','Пробег, км'],['drive','Привод'],['wheel','Руль'],['color','Цвет'],['damage','Повреждения']] as const).map(([name, label]) => <label key={name} className="space-y-2 text-sm font-medium text-dark"><span>{label}</span><input className={field} type={name === "mileage" ? "number" : "text"} value={form[name]} onChange={(e) => set(name, e.target.value)} /></label>)}
        </div>
        <label className="mt-5 block space-y-2 text-sm font-medium text-dark"><span>Описание</span><textarea rows={5} className={field} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
      </section>

      <section className="rounded-2xl border border-gray-border bg-white p-6 sm:p-8">
        <h2 className="text-xl font-bold text-dark">Фотографии</h2><p className="mt-1 text-sm text-gray-text">JPEG, PNG или WebP, до 8 МБ каждый. Первая фотография станет обложкой.</p>
        {images.length > 0 && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{images.map((image, index) => <div key={image.id} className="overflow-hidden rounded-xl border border-gray-border bg-gray-bg"><div className="relative aspect-[4/3]"><Image src={image.preview} alt={`Фотография ${index + 1}`} fill unoptimized className="object-cover" />{index === 0 && <span className="absolute left-2 top-2 rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-white">Обложка</span>}</div><div className="flex items-center justify-between gap-2 p-2"><span className="min-w-0 truncate text-xs text-gray-text">{image.file.name}</span><div className="flex shrink-0"><button type="button" disabled={index === 0} onClick={() => moveImage(index, -1)} aria-label="Переместить выше" className="p-1.5 text-gray-text hover:text-primary disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)} aria-label="Переместить ниже" className="p-1.5 text-gray-text hover:text-primary disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => removeImage(image.id)} aria-label="Удалить фотографию" className="p-1.5 text-gray-text hover:text-primary"><X className="h-4 w-4" /></button></div></div></div>)}</div>}
        {images.length < 20 && <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-border px-5 py-8 text-sm font-semibold text-gray-text transition-colors hover:border-primary hover:text-primary"><ImagePlus className="h-5 w-5" />Выбрать фотографии<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={selectImages} /></label>}
      </section>

      {message && <p className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${status === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{status === "success" && <CheckCircle2 className="h-5 w-5" />}{message}</p>}
      <button disabled={status === "loading"} className="inline-flex min-w-56 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60">{status === "loading" && <LoaderCircle className="h-5 w-5 animate-spin" />}{status === "loading" ? `Загрузка ${uploadProgress}%` : "Добавить в каталог"}</button>
    </form>
  );
}
