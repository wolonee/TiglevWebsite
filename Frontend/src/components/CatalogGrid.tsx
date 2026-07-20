"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { bodyTypes, brands, type Car } from "@/data/cars";
import CarCard from "./CarCard";
import SectionHeading from "./SectionHeading";
import AppSelect from "./AppSelect";

type CatalogFilters = { brand: string; body: string; min: string; max: string };
const emptyFilters: CatalogFilters = { brand: "", body: "", min: "", max: "" };

function filtersFromUrl(): CatalogFilters {
  const params = new URLSearchParams(window.location.search);
  return { brand: params.get("brand") ?? "", body: params.get("body") ?? "", min: params.get("min") ?? "", max: params.get("max") ?? "" };
}

export default function CatalogGrid({ cars }: { cars: Car[] }) {
  const [brand, setBrand] = useState(emptyFilters.brand); const [body, setBody] = useState(emptyFilters.body);
  const [min, setMin] = useState(emptyFilters.min); const [max, setMax] = useState(emptyFilters.max);
  const [appliedBrand, setAppliedBrand] = useState(emptyFilters.brand); const [appliedBody, setAppliedBody] = useState(emptyFilters.body);
  const [appliedMin, setAppliedMin] = useState(emptyFilters.min); const [appliedMax, setAppliedMax] = useState(emptyFilters.max); const [visible, setVisible] = useState(6);
  const sentinel = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => cars.filter(c => (!appliedBrand || c.brand === appliedBrand) && (!appliedBody || c.bodyType === appliedBody) && (!appliedMin || c.price >= Number(appliedMin)) && (!appliedMax || c.price <= Number(appliedMax))), [cars, appliedBrand, appliedBody, appliedMin, appliedMax]);
  const applyFilters = () => {
    setAppliedBrand(brand); setAppliedBody(body); setAppliedMin(min); setAppliedMax(max); setVisible(6);
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand); if (body) params.set("body", body); if (min) params.set("min", min); if (max) params.set("max", max);
    window.history.replaceState(null, "", params.size ? `/catalog?${params.toString()}` : "/catalog");
  };
  useEffect(() => {
    const syncFromUrl = () => {
      const filters = filtersFromUrl();
      setBrand(filters.brand); setBody(filters.body); setMin(filters.min); setMax(filters.max);
      setAppliedBrand(filters.brand); setAppliedBody(filters.body); setAppliedMin(filters.min); setAppliedMax(filters.max); setVisible(6);
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);
  useEffect(() => { const node = sentinel.current; if (!node) return; const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(v => Math.min(v + 3, filtered.length)); }, { rootMargin: "600px" }); observer.observe(node); return () => observer.disconnect(); }, [filtered.length]);
  const field = "w-full rounded-xl border border-gray-border bg-white px-4 py-3 text-sm text-dark outline-none shadow-none transition-colors focus:border-primary focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:shadow-none";
  return <section id="catalog" className="section-space bg-gray-bg"><div className="shell">
    <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><SectionHeading eyebrow="Каталог" title="Автомобили в наличии" description={`${filtered.length} автомобилей`} align="left"/><SlidersHorizontal className="text-primary"/></div>
    <div className="mb-10 grid gap-3 rounded-[20px] border border-gray-border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
      <AppSelect searchable searchPlaceholder="Найти марку…" ariaLabel="Марка автомобиля" placeholder="Все марки" clearLabel="Все марки" options={brands} value={brand} onValueChange={value => { setBrand(value); setVisible(6); }}/>
      <AppSelect searchable ariaLabel="Тип кузова" placeholder="Все кузова" clearLabel="Все кузова" options={bodyTypes} value={body} onValueChange={value => { setBody(value); setVisible(6); }}/>
      <input className={field} inputMode="numeric" placeholder="Цена от, ₽" value={min} onChange={e => setMin(e.target.value.replace(/\D/g, ""))} onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}/>
      <input className={field} inputMode="numeric" placeholder="Цена до, ₽" value={max} onChange={e => setMax(e.target.value.replace(/\D/g, ""))} onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}/>
      <button onClick={applyFilters} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark"><Search className="h-4 w-4"/>Найти</button>
    </div>
    {filtered.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">{filtered.slice(0, visible).map(car => <CarCard key={car.id} car={car}/>)}</div> : <div className="rounded-[20px] border border-gray-border bg-white py-20 text-center"><h3 className="text-xl font-bold text-dark">Автомобили не найдены</h3><p className="mt-2 text-gray-text">Попробуйте изменить параметры фильтра</p></div>}
    <div ref={sentinel} className="h-1" />{visible < filtered.length && <p className="mt-8 text-center text-sm text-gray-text">Загружаем ещё автомобили…</p>}
  </div></section>;
}
