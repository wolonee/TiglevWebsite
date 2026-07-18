import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import CarGallery from "@/components/CarGallery";
import { formatPrice } from "@/data/cars";

export default async function AdminPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const backendUrl = process.env.BACKEND_URL; const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) notFound();
  const response = await fetch(`${backendUrl}/api/admin/cars/${encodeURIComponent(id)}`, { headers: { "x-api-key": apiKey }, cache: "no-store" });
  if (!response.ok) notFound();
  const { car } = await response.json() as { car: { brand: string; model: string; year: number; bodyType: string; price: number; images: string[]; description?: string; status: string } };
  return <section><Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-text hover:text-primary"><ArrowLeft className="h-4 w-4" />К списку автомобилей</Link><p className="mt-7 text-sm text-primary">Предпросмотр · {car.status}</p><div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm text-gray-text">{car.year} · {car.bodyType}</p><h1 className="mt-1 text-3xl font-extrabold text-dark">{car.brand} {car.model}</h1></div><p className="text-3xl font-extrabold text-primary">{formatPrice(car.price)}</p></div><div className="mt-8 grid gap-8 lg:grid-cols-[.7fr_1.3fr]"><CarGallery images={car.images} alt={`${car.brand} ${car.model}`} /><div><h2 className="text-2xl font-bold text-dark">Описание</h2><p className="mt-4 leading-7 text-gray-text">{car.description || "Описание пока не добавлено."}</p></div></div></section>;
}
