"use client";

import { useState } from "react";
import { cars } from "@/data/cars";
import CarCard from "./CarCard";

type FilterTab = "all" | "fast" | "elite";

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "fast", label: "Срочно" },
  { id: "elite", label: "Элитное" },
];

const INITIAL_COUNT = 6;

const Catalog = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showAll, setShowAll] = useState(false);

  const filtered = cars.filter((car) => {
    if (activeTab === "fast") return car.fast;
    if (activeTab === "elite") return car.elite;
    return true;
  });

  const displayed = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);
  const hasMore = filtered.length > INITIAL_COUNT && !showAll;

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setShowAll(false);
  };

  const handleShowAll = () => setShowAll(true);

  return (
    <section id="catalog" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
              Каталог
            </p>
            <h2 className="text-3xl font-extrabold text-dark sm:text-4xl">
              Автомобили в наличии
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-gray-bg p-1" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-text hover:text-dark"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>

        {/* Empty state */}
        {displayed.length === 0 && (
          <p className="py-16 text-center text-lg text-gray-text">
            Автомобили не найдены
          </p>
        )}

        {/* Show more */}
        {hasMore && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={handleShowAll}
              className="rounded-xl border-2 border-gray-border px-8 py-3.5 text-sm font-bold text-dark-light transition-all hover:border-primary hover:text-primary"
              aria-label="Показать ещё автомобили"
            >
              Показать ещё ({filtered.length - INITIAL_COUNT})
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Catalog;
