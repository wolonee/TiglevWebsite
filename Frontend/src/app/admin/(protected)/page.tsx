import type { Metadata } from "next";
import AdminCarManager from "@/components/AdminCarManager";

export const metadata: Metadata = { title: "Админка — TIGLEV.COM" };

export default function AdminPage() {
  return <AdminCarManager />;
}
