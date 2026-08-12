import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminRequestDetails from "@/components/AdminRequestDetails";
import type { CustomerRequest } from "@/data/adminRequests";

export const metadata: Metadata = { title: "Заявка клиента | TIGLEV.COM" };

export default async function AdminRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;
  if (!backendUrl || !apiKey) notFound();

  const response = await fetch(`${backendUrl}/api/admin/requests/${encodeURIComponent(id)}`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });
  if (!response.ok) notFound();

  const { request } = await response.json() as { request: CustomerRequest };
  return <AdminRequestDetails initialRequest={request} />;
}
