"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cars } from "@/data/cars";
import CarCard from "./CarCard";

type FilterTab = "all" | "fast" | "elite";

const TABS: { id: FilterTab; label: string; description: string }[] = [
  { id: "all", label: "Все", description: "Все автомобили" },
  { id: "fast", label: "Срочно", description: "Автомобили со скидкой" },
  { id: "elite", label: "Элитное", description: "Премиум автомобили" },
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
  const remainingCount = filtered.length - INITIAL_COUNT;
  const hasMore = remainingCount > 0 && !showAll;

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setShowAll(false);
  };

  const handleShowAll = () => setShowAll(true);

  const getTabCount = (tabId: FilterTab): number => {
    if (tabId === "fast") return cars.filter((c) => c.fast).length;
    if (tabId === "elite") return cars.filter((c) => c.elite).length;
    return cars.length;
  };

  return (
    <section id="catalog" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Каталог
            </p>
            <h2 className="text-3xl font-extrabold text-dark sm:text-4xl">
              Автомобили в наличии
            </h2>
            <p className="mt-3 text-gray-text">
              {filtered.length}{" "}
              {filtered.length === 1
                ? "автомобиль"
                : filtered.length < 5
                  ? "автомобиля"
                  : "автомобилей"}
            </p>
          </div>

          <div
            className="flex gap-1 rounded-xl bg-gray-bg p-1"
            role="tablist"
            aria-label="Фильтр автомобилей"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-label={tab.description}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-sm shadow-primary/20"
                    : "text-gray-text hover:text-dark"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs transition-colors ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-gray-border text-gray-text"
                  }`}
                >
                  {getTabCount(tab.id)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
          role="tabpanel"
        >
          {displayed.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>

        {displayed.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-bg">
              <ChevronDown className="h-8 w-8 text-gray-text" />
            </div>
            <p className="text-lg font-semibold text-dark">
              Автомобили не найдены
            </p>
            <p className="mt-2 text-sm text-gray-text">
              Попробуйте изменить фильтр
            </p>
          </div>
        )}

        {hasMore && (
          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={handleShowAll}
              className="group rounded-xl border-2 border-gray-border px-8 py-3.5 text-sm font-bold text-dark-light transition-all duration-300 hover:border-primary hover:text-primary active:scale-[0.97]"
              aria-label={`Показать ещё ${remainingCount} автомобилей`}
            >
              Показать ещё{" "}
              <span className="text-gray-text transition-colors group-hover:text-primary">
                +{remainingCount}
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Catalog;
