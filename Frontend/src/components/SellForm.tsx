"use client";

import Image from "next/image";
import { AlertCircle, CheckCircle2, ImagePlus, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { bodyTypes } from "@/data/cars";
import AppSelect from "./AppSelect";

type Photo = { file: File; url: string };
type FieldName = "model" | "year" | "firstName" | "lastName" | "email" | "phone";
type Errors = Partial<Record<FieldName, string>>;

const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 320 * 1024;
const MAX_TOTAL_PHOTO_BYTES = 3.5 * 1024 * 1024;

const compressPhoto = async (file: File): Promise<File> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Не удалось обработать фотографию");
  }

  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.82;
  let blob: Blob | null = null;
  do {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    quality -= 0.1;
  } while (blob && blob.size > MAX_PHOTO_BYTES && quality >= 0.32);

  if (!blob) throw new Error("Не удалось обработать фотографию");
  const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
  return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
};

const validateField = (name: FieldName, value: string): string => {
  const trimmed = value.trim();
  if (name === "model" && !trimmed) return "Укажите марку и модель автомобиля";
  if (name === "year" && (!/^\d{4}$/.test(trimmed) || Number(trimmed) < 1950 || Number(trimmed) > 2027)) return "Введите корректный год выпуска";
  if (name === "firstName" && trimmed.length < 2) return "Введите имя — минимум 2 символа";
  if (name === "lastName" && trimmed.length < 2) return "Введите фамилию — минимум 2 символа";
  if (name === "email" && trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Проверьте формат электронной почты";
  if (name === "phone" && value.replace(/\D/g, "").slice(1).length !== 10) return "Введите 10 цифр номера после +7";
  return "";
};

export default function SellForm() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [formState, setFormState] = useState<"idle" | "sending" | "success">("idle");
  const [phone, setPhone] = useState("+7 ");
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState("");
  const photoUrls = useRef<string[]>([]);

  useEffect(() => () => photoUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const fieldClass = (name: FieldName) => `mt-1.5 w-full rounded-xl border bg-gray-bg px-4 py-3.5 text-sm text-dark outline-none shadow-none transition-colors focus:bg-white focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:shadow-none ${errors[name] ? "border-primary bg-red-50/40" : "border-gray-border focus:border-primary"}`;
  const validate = (name: FieldName, value: string) => setErrors((current) => ({ ...current, [name]: validateField(name, value) || undefined }));
  const clearError = (name: FieldName) => setErrors((current) => current[name] ? { ...current, [name]: undefined } : current);
  const errorText = (name: FieldName) => errors[name] && <span id={`${name}-error`} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-primary"><AlertCircle className="h-3.5 w-3.5" />{errors[name]}</span>;

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const availableSlots = MAX_PHOTOS - photos.length;
    if (availableSlots <= 0) {
      setSubmitError(`Можно добавить не больше ${MAX_PHOTOS} фотографий.`);
      return;
    }

    setSubmitError("");
    try {
      const selected = Array.from(files).slice(0, availableSlots);
      const compressed = await Promise.all(selected.map(compressPhoto));
      const totalSize = [...photos.map((photo) => photo.file), ...compressed].reduce((sum, file) => sum + file.size, 0);
      if (totalSize > MAX_TOTAL_PHOTO_BYTES) {
        setSubmitError("Фотографии получились слишком большими. Удалите часть фотографий и попробуйте снова.");
        return;
      }
      const added = compressed.map((file) => ({ file, url: URL.createObjectURL(file) }));
      photoUrls.current.push(...added.map((photo) => photo.url));
      setPhotos((current) => [...current, ...added]);
      if (files.length > availableSlots) setSubmitError(`Добавлены первые ${availableSlots} фотографий из ${files.length}. Максимум — ${MAX_PHOTOS}.`);
    } catch {
      setSubmitError("Не удалось обработать одну из фотографий. Выберите другой файл.");
    }
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const localNumber = (digits.startsWith("7") ? digits.slice(1) : digits).slice(0, 10);
    setPhone(`+7 ${localNumber}`);
    clearError("phone");
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values: Record<FieldName, string> = {
      model: String(data.get("model") ?? ""), year: String(data.get("year") ?? ""),
      firstName: String(data.get("firstName") ?? ""), lastName: String(data.get("lastName") ?? ""),
      email: String(data.get("email") ?? ""), phone,
    };
    const nextErrors = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, validateField(name as FieldName, value)]).filter(([, error]) => error)) as Errors;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    photos.forEach((photo) => data.append("photos", photo.file, photo.file.name));
    setSubmitError("");
    setFormState("sending");
    try {
      const response = await fetch("/api/sell-requests", { method: "POST", body: data });
      if (!response.ok) throw new Error("Request failed");
      setFormState("success");
    } catch {
      setSubmitError("Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.");
      setFormState("idle");
    }
  };

  if (formState === "success") return <div className="rounded-[20px] border border-gray-border bg-white p-12 text-center"><CheckCircle2 className="mx-auto text-green-500" size={64} /><h2 className="mt-5 text-2xl font-bold text-dark">Спасибо за заявку!</h2><p className="mt-2 text-gray-text">Наш специалист свяжется с вами для оценки автомобиля.</p></div>;

  return <form onSubmit={submit} noValidate className="rounded-[20px] border border-gray-border bg-white p-6 shadow-sm sm:p-10">
    <h2 className="text-xl font-bold text-dark">Данные об автомобиле</h2>
    <div className="mt-6 grid gap-5 sm:grid-cols-2">
      <label className="min-w-0 text-sm font-medium text-dark">Марка и модель *<input name="model" aria-invalid={Boolean(errors.model)} aria-describedby={errors.model ? "model-error" : undefined} className={fieldClass("model")} placeholder="KIA Sportage" onInput={() => clearError("model")} onBlur={(e) => validate("model", e.target.value)} />{errorText("model")}</label>
      <label className="text-sm font-medium text-dark">Год выпуска *<input name="year" type="number" min="1950" max="2027" aria-invalid={Boolean(errors.year)} aria-describedby={errors.year ? "year-error" : undefined} className={fieldClass("year")} placeholder="2020" onInput={() => clearError("year")} onBlur={(e) => validate("year", e.target.value)} />{errorText("year")}</label>
      <label className="text-sm font-medium text-dark">Тип кузова<AppSelect name="body" ariaLabel="Тип кузова" placeholder="Выберите" options={bodyTypes} className="mt-1.5 bg-gray-bg" /></label>
      <label className="text-sm font-medium text-dark">Тип двигателя<AppSelect name="engine" ariaLabel="Тип двигателя" placeholder="Выберите" options={["Бензин", "Дизель", "Гибрид", "Электро"]} className="mt-1.5 bg-gray-bg" /></label>
      <label className="text-sm font-medium text-dark">Руль<AppSelect name="wheel" ariaLabel="Расположение руля" placeholder="Выберите" options={["Левый", "Правый"]} className="mt-1.5 bg-gray-bg" /></label>
      <label className="text-sm font-medium text-dark">Коробка передач<AppSelect name="transmission" ariaLabel="Коробка передач" placeholder="Выберите" options={["Автомат", "Механика", "Робот", "Вариатор"]} className="mt-1.5 bg-gray-bg" /></label>
      <label className="text-sm font-medium text-dark sm:col-span-2">Пробег, км<input name="mileage" type="number" min="0" className="mt-1.5 w-full rounded-xl border border-gray-border bg-gray-bg px-4 py-3.5 text-sm outline-none focus:border-primary" placeholder="75 000" /></label>
    </div>
    <h2 className="mb-6 mt-9 text-xl font-bold text-dark">Контактные данные</h2>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-medium text-dark">Имя *<input name="firstName" aria-invalid={Boolean(errors.firstName)} aria-describedby={errors.firstName ? "firstName-error" : undefined} className={fieldClass("firstName")} placeholder="Иван" onInput={() => clearError("firstName")} onBlur={(e) => validate("firstName", e.target.value)} />{errorText("firstName")}</label>
      <label className="text-sm font-medium text-dark">Фамилия *<input name="lastName" aria-invalid={Boolean(errors.lastName)} aria-describedby={errors.lastName ? "lastName-error" : undefined} className={fieldClass("lastName")} placeholder="Иванов" onInput={() => clearError("lastName")} onBlur={(e) => validate("lastName", e.target.value)} />{errorText("lastName")}</label>
      <label className="text-sm font-medium text-dark">E-mail<input name="email" type="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} className={fieldClass("email")} placeholder="ivan@mail.ru" onInput={() => clearError("email")} onBlur={(e) => validate("email", e.target.value)} />{errorText("email")}</label>
      <label className="text-sm font-medium text-dark">Телефон *<input name="phone" type="tel" value={phone} inputMode="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "phone-error" : undefined} className={fieldClass("phone")} onChange={(e) => handlePhoneChange(e.target.value)} onBlur={() => validate("phone", phone)} />{errorText("phone")}</label>
    </div>
    <div className="mt-7"><p className="mb-2 text-sm font-medium text-dark">Фотографии автомобиля</p><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-border bg-gray-bg px-4 py-3 text-sm font-semibold text-dark hover:border-primary hover:text-primary"><ImagePlus size={18} />Добавить фото<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} /></label><span className="ml-3 text-xs text-gray-text">До {MAX_PHOTOS} фото</span>{photos.length > 0 && <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">{photos.map((photo, index) => <div key={photo.url} className="relative aspect-square overflow-hidden rounded-xl"><Image src={photo.url} alt={`Загруженное фото ${index + 1}`} fill className="object-cover" unoptimized /><button type="button" onClick={() => { URL.revokeObjectURL(photo.url); setPhotos((current) => current.filter((item) => item !== photo)); }} className="absolute right-1 top-1 rounded-full bg-dark/70 p-1 text-white" aria-label="Удалить фото"><X size={14} /></button></div>)}</div>}</div>
    {submitError && <div role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-primary/20 bg-red-50 p-4 text-sm text-primary"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{submitError}</div>}
    <button disabled={formState === "sending"} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">{formState === "sending" ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send size={17} />} {formState === "sending" ? "Отправляем…" : "Отправить заявку"}</button>
  </form>;
}
