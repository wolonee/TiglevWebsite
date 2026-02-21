"use client";

import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { brands, bodyTypes } from "@/data/cars";

const Hero = () => {
  const [brand, setBrand] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");

  const handleSearch = () => {
    const el = document.getElementById("catalog");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const selectClassName =
    "relative w-full appearance-none rounded-xl bg-white py-3.5 pr-10 pl-4 text-sm font-medium text-dark-light outline-none transition-shadow focus:ring-2 focus:ring-primary/30";

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-dark">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80')",
        }}
        role="img"
        aria-label="Фон — автомобиль"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-dark/80 via-dark/60 to-dark/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark/50 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-28 pb-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl animate-fade-in">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            <span className="text-xs font-medium tracking-wide text-white/70">
              Автосалон в Тольятти — с 2009 года
            </span>
          </div>

          <h1 className="mb-6 text-4xl leading-[1.1] font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Автомобили{" "}
            <span className="bg-gradient-to-r from-primary-light to-primary bg-clip-text text-transparent">
              с пробегом
            </span>
          </h1>

          <p className="mb-12 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg">
            Продажа, выкуп и заказ автомобилей из Европы. Честные цены,
            юридическая чистота и прозрачные сделки.
          </p>
        </div>

        <div
          className="max-w-4xl animate-slide-up rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-2xl backdrop-blur-xl sm:p-4"
          style={{ animationDelay: "200ms" }}
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
            <div className="relative">
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className={selectClassName}
                aria-label="Выберите марку"
              >
                <option value="">Марка авто</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-text" />
            </div>

            <input
              type="text"
              inputMode="numeric"
              placeholder="Цена от, ₽"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded-xl bg-white px-4 py-3.5 text-sm font-medium text-dark-light outline-none transition-shadow focus:ring-2 focus:ring-primary/30 placeholder:text-gray-text"
              aria-label="Цена от"
            />

            <input
              type="text"
              inputMode="numeric"
              placeholder="Цена до, ₽"
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded-xl bg-white px-4 py-3.5 text-sm font-medium text-dark-light outline-none transition-shadow focus:ring-2 focus:ring-primary/30 placeholder:text-gray-text"
              aria-label="Цена до"
            />

            <div className="relative">
              <select
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
                className={selectClassName}
                aria-label="Выберите кузов"
              >
                <option value="">Тип кузова</option>
                {bodyTypes.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-text" />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30 active:scale-[0.97]"
              aria-label="Найти автомобили"
            >
              <Search className="h-4 w-4" />
              Найти
            </button>
          </div>
        </div>

        <div
          className="mt-12 flex flex-wrap gap-8 animate-fade-in sm:gap-12"
          style={{ animationDelay: "400ms" }}
        >
          {[
            { value: "3 000+", label: "автомобилей продано" },
            { value: "15+", label: "лет на рынке" },
            { value: "98%", label: "довольных клиентов" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-extrabold text-white sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs tracking-wide text-white/40 sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
        <a
          href="#services"
          className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/20 pt-1.5"
          aria-label="Прокрутить вниз"
        >
          <span className="h-2 w-1 rounded-full bg-white/50" />
        </a>
      </div>
    </section>
  );
};

export default Hero;
