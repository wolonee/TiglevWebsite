"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, LoaderCircle, Plus, X } from "lucide-react";
import { bodyTypes, brands } from "@/data/cars";
import AppSelect from "./AppSelect";

const initialState = {
  brand: "", model: "", price: "", year: String(new Date().getFullYear()), bodyType: "", engine: "",
  description: "", engineVolume: "", power: "", transmission: "", mileage: "", drive: "",
  wheel: "", color: "", damage: "",
};

export default function AdminCarForm() {
  const [form, setForm] = useState(initialState);
  const [images, setImages] = useState([""]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const field = "w-full rounded-xl border border-gray-border bg-white px-4 py-3 text-sm text-dark outline-none transition-colors focus:border-primary focus:ring-0";
  const set = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault(); setStatus("loading"); setMessage("");
    const payload = {
      ...form, price: Number(form.price), year: Number(form.year),
      mileage: form.mileage ? Number(form.mileage) : undefined,
      images: images.map((image) => image.trim()).filter(Boolean),
    };
    try {
      const response = await fetch("/api/admin/cars", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось добавить автомобиль");
      setStatus("success"); setMessage("Автомобиль добавлен в каталог"); setForm(initialState); setImages([""]);
    } catch (error) {
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
        <h2 className="text-xl font-bold text-dark">Фотографии</h2><p className="mt-1 text-sm text-gray-text">Добавьте прямые HTTPS-ссылки на фотографии. Первая станет обложкой.</p>
        <div className="mt-5 space-y-3">{images.map((image, index) => <div key={index} className="flex gap-2"><input required={index === 0} type="url" className={field} placeholder="https://..." value={image} onChange={(e) => setImages((current) => current.map((item, itemIndex) => itemIndex === index ? e.target.value : item))} />{images.length > 1 && <button type="button" aria-label="Удалить ссылку" onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl border border-gray-border px-3 text-gray-text hover:border-primary hover:text-primary"><X className="h-5 w-5" /></button>}</div>)}</div>
        {images.length < 20 && <button type="button" onClick={() => setImages((current) => [...current, ""])} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Plus className="h-4 w-4" />Добавить фотографию</button>}
      </section>

      {message && <p className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${status === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{status === "success" && <CheckCircle2 className="h-5 w-5" />}{message}</p>}
      <button disabled={status === "loading"} className="inline-flex min-w-56 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60">{status === "loading" && <LoaderCircle className="h-5 w-5 animate-spin" />}Добавить в каталог</button>
    </form>
  );
}
