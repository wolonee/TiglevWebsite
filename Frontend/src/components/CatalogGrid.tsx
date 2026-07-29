"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { type Car } from "@/data/cars";
import CarCard from "./CarCard";
import SectionHeading from "./SectionHeading";

type CatalogFilters = { min: string; max: string };
const emptyFilters: CatalogFilters = { min: "", max: "" };

function filtersFromUrl(): CatalogFilters {
  const params = new URLSearchParams(window.location.search);
  return { min: params.get("min") ?? "", max: params.get("max") ?? "" };
}

export default function CatalogGrid({ cars }: { cars: Car[] }) {
  const [min, setMin] = useState(emptyFilters.min); const [max, setMax] = useState(emptyFilters.max);
  const [appliedMin, setAppliedMin] = useState(emptyFilters.min); const [appliedMax, setAppliedMax] = useState(emptyFilters.max); const [visible, setVisible] = useState(6);
  const [isUpdating, startCatalogTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => cars.filter(c => (!appliedMin || c.price >= Number(appliedMin)) && (!appliedMax || c.price <= Number(appliedMax))), [cars, appliedMin, appliedMax]);
  const applyFilters = () => {
    startCatalogTransition(() => {
      setAppliedMin(min); setAppliedMax(max); setVisible(6);
    });
    const params = new URLSearchParams();
    if (min) params.set("min", min); if (max) params.set("max", max);
    window.history.replaceState(null, "", params.size ? `/?${params.toString()}#catalog` : "/#catalog");
  };
  useEffect(() => {
    const syncFromUrl = () => {
      const filters = filtersFromUrl();
      setMin(filters.min); setMax(filters.max);
      setAppliedMin(filters.min); setAppliedMax(filters.max); setVisible(6);
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);
  useEffect(() => { const node = sentinel.current; if (!node) return; const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(v => Math.min(v + 3, filtered.length)); }, { rootMargin: "600px" }); observer.observe(node); return () => observer.disconnect(); }, [filtered.length]);
  const field = "w-full rounded-xl border border-gray-border bg-white px-4 py-3 text-sm text-dark outline-none shadow-none transition-colors focus:border-primary focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:shadow-none";
  return <section id="catalog" className="section-space bg-gray-bg"><div className="shell">
    <div className="mb-7 sm:mb-10"><SectionHeading eyebrow="Каталог" title="Автомобили в наличии" description={`${filtered.length} автомобилей`} align="left"/></div>
    <div id="catalog-filters" className="mb-7 grid gap-3 rounded-[20px] border border-gray-border bg-white p-4 shadow-sm sm:mb-10 sm:grid-cols-3">
      <input className={field} inputMode="numeric" placeholder="Цена от, ₽" value={min} onChange={e => setMin(e.target.value.replace(/\D/g, ""))} onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}/>
      <input className={field} inputMode="numeric" placeholder="Цена до, ₽" value={max} onChange={e => setMax(e.target.value.replace(/\D/g, ""))} onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}/>
      <button onClick={applyFilters} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark"><Search className="h-4 w-4"/>Найти</button>
    </div>
    <div className="catalog-results" data-updating={isUpdating}>{filtered.length ? <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">{filtered.slice(0, visible).map((car, index) => <CarCard key={car.id} car={car} preloadCover={index < 3}/>)}</div> : <div className="rounded-[20px] border border-gray-border bg-white px-5 py-16 text-center"><h3 className="text-xl font-bold text-dark">Автомобили не найдены</h3><p className="mt-2 text-sm text-gray-text">Попробуйте изменить параметры фильтра</p></div>}</div>
    <div ref={sentinel} className="h-1" />{visible < filtered.length && <p className="mt-8 text-center text-sm text-gray-text">Загружаем ещё автомобили…</p>}
  </div></section>;
}
