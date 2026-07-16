import type { Metadata } from "next";
import Contacts from "@/components/Contacts";
import SitePage, { PageHero } from "@/components/SitePage";
export const metadata: Metadata = { title: "Контакты — TIGLEV.COM" };
export default function ContactsPage() { return <SitePage><PageHero eyebrow="Контакты" title="Свяжитесь с нами" text="Ответим на вопросы и поможем подобрать автомобиль"/><Contacts hideHeading/></SitePage>; }
