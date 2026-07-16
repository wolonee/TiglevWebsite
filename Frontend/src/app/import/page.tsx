import type { Metadata } from "next";
import ContactList from "@/components/ContactList";
import SitePage, { PageHero } from "@/components/SitePage";
import SectionHeading from "@/components/SectionHeading";
export const metadata: Metadata = { title: "Авто на заказ — TIGLEV.COM" };
export default function ImportPage() { return <SitePage><PageHero eyebrow="Авто на заказ" title="Заказ авто из Японии, Китая и Кореи" text="Подберём, проверим, оформим и доставим автомобиль под ваш бюджет и требования"/><section className="section-space bg-gray-bg"><div className="shell"><div className="mx-auto max-w-3xl rounded-[20px] border border-gray-border bg-white p-8 sm:p-12"><SectionHeading eyebrow="Обсудить заказ" title="Свяжитесь с нами" description="Расскажите, какой автомобиль вы ищете. Специалист уточнит бюджет, сроки и подготовит варианты." align="left" className="mb-9"/><ContactList/></div></div></section></SitePage>; }
