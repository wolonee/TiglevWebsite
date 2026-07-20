import type { Metadata } from "next";
import CatalogGrid from "@/components/CatalogGrid";
import SitePage, { PageHero } from "@/components/SitePage";
import { getCatalogCars } from "@/data/cars";

export const metadata: Metadata = { title: "Каталог автомобилей — TIGLEV.COM" };
export const revalidate = 900;

export default async function CatalogPage() {
  const catalogCars = await getCatalogCars();
  return <SitePage><PageHero eyebrow="Каталог" title="Автомобили в наличии" text="Проверенные автомобили с прозрачной историей и готовыми документами"/><CatalogGrid cars={catalogCars}/></SitePage>;
}
