import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import SitePage from "@/components/SitePage";
import CarGallery from "@/components/CarGallery";
import { formatPrice } from "@/data/cars";
import { getAdminAccess } from "@/lib/admin-auth";

type PreviewCar = {
  brand: string; model: string; year: number; bodyType: string; price: number; images: string[]; engine: string;
  description?: string; engineVolume?: string; power?: string; transmission?: string; mileage?: number;
  drive?: string; wheel?: string; color?: string; damage?: string;
};

export default async function AdminPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getAdminAccess();
  if (!access.userId) redirect("/admin/sign-in");
  if (!access.isAdmin) redirect("/admin/forbidden");
  const { id } = await params; const backendUrl = process.env.BACKEND_URL; const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) notFound();
  const response = await fetch(`${backendUrl}/api/admin/cars/${encodeURIComponent(id)}`, { headers: { "x-api-key": apiKey }, cache: "no-store" });
  if (!response.ok) notFound();
  const { car } = await response.json() as { car: PreviewCar };
  const specs = [["Цена", formatPrice(car.price)],["Двигатель", car.engine],["Объём двигателя", car.engineVolume],["Мощность", car.power],["Трансмиссия", car.transmission],["Пробег", car.mileage ? `${car.mileage.toLocaleString("ru-RU")} км` : "Новый автомобиль"],["Год выпуска", `${car.year} год`],["Привод", car.drive],["Руль", car.wheel],["Тип кузова", car.bodyType],["Цвет", car.color],["Повреждения кузова", car.damage]];
  return <SitePage><section className="bg-gray-bg pb-12 pt-28"><div className="shell"><Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-text hover:text-primary"><ArrowLeft size={16} />Вернуться в админку</Link><div className="mt-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm text-gray-text">{car.year} · {car.bodyType}</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-dark sm:text-4xl">{car.brand} {car.model}</h1></div><p className="text-3xl font-extrabold text-primary">{formatPrice(car.price)}</p></div></div></section><section className="section-space pt-10"><div className="shell grid gap-8 lg:grid-cols-[.7fr_1.3fr]"><aside className="rounded-[20px] border border-gray-border bg-white p-7"><h2 className="mb-4 text-xl font-bold text-dark">Характеристики</h2>{specs.map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-gray-border py-3 text-sm last:border-0"><span className="text-gray-text">{label}</span><strong className="text-right font-semibold text-dark">{value}</strong></div>)}</aside><CarGallery images={car.images} alt={`${car.brand} ${car.model}`} /><div className="lg:col-span-2"><h2 className="text-2xl font-bold text-dark">Описание</h2><p className="mt-4 leading-7 text-gray-text">{car.description ?? `${car.brand} ${car.model} ${car.year} года выпуска. Пробег подтверждён, автомобиль обслуживался по регламенту. Кузов без серьёзных повреждений. Автомобиль проверен нашими специалистами и готов к оформлению.`}</p></div></div></section></SitePage>;
}
