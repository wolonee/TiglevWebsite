import type { Metadata } from "next";
import AdminCarEditor from "@/components/AdminCarEditor";

export const metadata: Metadata = { title: "Добавить автомобиль — TIGLEV.COM" };

export default function NewAdminCarPage() {
  return <AdminCarEditor />;
}
