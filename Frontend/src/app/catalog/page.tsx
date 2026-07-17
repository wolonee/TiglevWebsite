import type { Metadata } from "next";
import CatalogGrid from "@/components/CatalogGrid";
import SitePage, { PageHero } from "@/components/SitePage";
import { getCatalogCars } from "@/data/cars";

export const metadata: Metadata = { title: "Каталог автомобилей — TIGLEV.COM" };
export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const [params, catalogCars] = await Promise.all([searchParams, getCatalogCars()]); const read = (key: string) => typeof params[key] === "string" ? params[key] : ""; return <SitePage><PageHero eyebrow="Каталог" title="Автомобили в наличии" text="Проверенные автомобили с прозрачной историей и готовыми документами"/><CatalogGrid cars={catalogCars} initialFilters={{ brand: read("brand"), body: read("body"), min: read("min"), max: read("max") }}/></SitePage>; }
