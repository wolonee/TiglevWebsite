import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminCarEditor from "@/components/AdminCarEditor";
import type { ManagedCar } from "@/components/AdminCarForm";

export const metadata: Metadata = { title: "Редактировать автомобиль — TIGLEV.COM" };

export default async function EditAdminCarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) notFound();

  const response = await fetch(`${backendUrl}/api/admin/cars/${encodeURIComponent(id)}`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });
  if (!response.ok) notFound();
  const { car } = await response.json() as { car: ManagedCar };

  return <AdminCarEditor car={car} />;
}
