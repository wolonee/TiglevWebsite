import type { Metadata } from "next";
import AdminRequestManager from "@/components/AdminRequestManager";

export const metadata: Metadata = { title: "Заявки — TIGLEV.COM" };

export default function RequestsPage() { return <AdminRequestManager />; }
