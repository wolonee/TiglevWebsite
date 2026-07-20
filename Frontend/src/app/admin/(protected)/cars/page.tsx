import type { Metadata } from "next";
import AdminCarManager from "@/components/AdminCarManager";

export const metadata: Metadata = { title: "Автомобили — TIGLEV.COM" };

export default function AdminCarsPage() {
  return <AdminCarManager />;
}
