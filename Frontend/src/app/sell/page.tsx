import type { Metadata } from "next";
import SellForm from "@/components/SellForm";
import SitePage, { PageHero } from "@/components/SitePage";
export const metadata: Metadata = { title: "Продать автомобиль — TIGLEV.COM" };
export default function SellPage() { return <SitePage><PageHero eyebrow="Выкуп автомобилей" title="Продать авто" text="Оценим ваш автомобиль и проведём безопасную сделку с выплатой в день обращения"/><section className="section-space bg-gray-bg"><div className="mx-auto max-w-4xl px-4"><SellForm/></div></section></SitePage>; }
