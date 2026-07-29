"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { type Car } from "@/data/cars";
import CarCard from "./CarCard";
import SectionHeading from "./SectionHeading";

type CatalogFilters = { max: string };
const emptyFilters: CatalogFilters = { max: "" };

function filtersFromUrl(): CatalogFilters {
  const params = new URLSearchParams(window.location.search);
  return { max: params.get("max") ?? "" };
}

export default function CatalogGrid({ cars }: { cars: Car[] }) {
  const catalogMaxPrice = useMemo(() => Math.max(0, ...cars.map((car) => car.price)), [cars]);
  const [max, setMax] = useState(emptyFilters.max);
  const [appliedMax, setAppliedMax] = useState(catalogMaxPrice); const [visible, setVisible] = useState(6);
  const [isUpdating, startCatalogTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);
  const priceDebounceTimer = useRef<number | undefined>(undefined);
  const filtered = useMemo(() => cars.filter((car) => car.price <= appliedMax), [cars, appliedMax]);
  const commitMaxPrice = (nextMax: number) => {
    const clampedMax = Math.min(Math.max(0, nextMax), catalogMaxPrice);

    startCatalogTransition(() => {
      setAppliedMax(clampedMax); setVisible(6);
    });
    const params = new URLSearchParams();
    if (clampedMax < catalogMaxPrice) params.set("max", String(clampedMax));
    window.history.replaceState(null, "", params.size ? `/?${params.toString()}#catalog` : "/#catalog");
  };
  const scheduleMaxPriceUpdate = (nextMax: number) => {
    setMax(String(nextMax));
    if (priceDebounceTimer.current !== undefined) window.clearTimeout(priceDebounceTimer.current);
    priceDebounceTimer.current = window.setTimeout(() => {
      commitMaxPrice(nextMax);
      priceDebounceTimer.current = undefined;
    }, 400);
  };
  useEffect(() => {
    const syncFromUrl = () => {
      if (priceDebounceTimer.current !== undefined) window.clearTimeout(priceDebounceTimer.current);
      priceDebounceTimer.current = undefined;
      const filters = filtersFromUrl();
      const urlMax = Number(filters.max);
      const nextMax = filters.max && Number.isFinite(urlMax) ? urlMax : catalogMaxPrice;
      const clampedMax = Math.min(Math.max(0, nextMax), catalogMaxPrice);

      setMax(String(clampedMax)); setAppliedMax(clampedMax); setVisible(6);
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [catalogMaxPrice]);
  useEffect(() => () => {
    if (priceDebounceTimer.current !== undefined) window.clearTimeout(priceDebounceTimer.current);
  }, []);
  useEffect(() => { const node = sentinel.current; if (!node) return; const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(v => Math.min(v + 3, filtered.length)); }, { rootMargin: "600px" }); observer.observe(node); return () => observer.disconnect(); }, [filtered.length]);
  const selectedMax = Number(max || catalogMaxPrice);
  const formatPrice = (price: number) => new Intl.NumberFormat("ru-RU").format(price);
  return <section id="catalog" className="section-space bg-gray-bg"><div className="shell">
    <div className="mb-7 sm:mb-10"><SectionHeading eyebrow="Каталог" title="Автомобили в наличии" description={`${filtered.length} автомобилей`} align="left"/></div>
    <div id="catalog-filters" className="mb-7 rounded-[20px] border border-gray-border bg-white p-4 shadow-sm sm:mb-10 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-dark"><label htmlFor="catalog-price" className="cursor-pointer">Цена до</label><output htmlFor="catalog-price" className="rounded-lg bg-primary/10 px-3 py-1.5 text-primary">{formatPrice(selectedMax)} ₽</output></div>
      <input id="catalog-price" aria-label="Цена до" type="range" min="0" max={catalogMaxPrice} step="10000" value={selectedMax} onChange={(event) => scheduleMaxPriceUpdate(Number(event.target.value))} className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-border accent-primary" />
      <div className="mt-2 flex justify-between text-xs text-gray-text"><span>0 ₽</span><span>{formatPrice(catalogMaxPrice)} ₽</span></div>
    </div>
    <div className="catalog-results" data-updating={isUpdating}>{filtered.length ? <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 lg:gap-8">{filtered.slice(0, visible).map((car, index) => <CarCard key={car.id} car={car} preloadCover={index < 3}/>)}</div> : <div className="rounded-[20px] border border-gray-border bg-white px-5 py-16 text-center"><h3 className="text-xl font-bold text-dark">Автомобили не найдены</h3><p className="mt-2 text-sm text-gray-text">Попробуйте изменить параметры фильтра</p></div>}</div>
    <div ref={sentinel} className="h-1" />{visible < filtered.length && <p className="mt-8 text-center text-sm text-gray-text">Загружаем ещё автомобили…</p>}
  </div></section>;
}
