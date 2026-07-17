import type { Metadata } from "next";
import Contacts from "@/components/Contacts";
import SitePage, { PageHero } from "@/components/SitePage";
export const metadata: Metadata = { title: "Авто на заказ — TIGLEV.COM" };
export default function ImportPage() { return <SitePage><PageHero eyebrow="Авто на заказ" title="Заказ авто из Японии, Китая и Кореи" text="Подберём, проверим, оформим и доставим автомобиль под ваш бюджет и требования"/><Contacts hideHeading/></SitePage>; }
