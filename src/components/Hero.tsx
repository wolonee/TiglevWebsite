"use client";

import { useState } from "react";
import { Search } from "lucide-react";
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

  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-dark">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-dark/90 via-dark/70 to-dark/50" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-32 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary-light">
            Автосалон в Тольятти
          </p>
          <h1 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            Автомобили
            <br />
            <span className="text-primary-light">с пробегом</span>
          </h1>
          <p className="mb-10 max-w-lg text-lg leading-relaxed text-white/70">
            Продажа, выкуп и заказ автомобилей из Европы. Более 15 лет на рынке
            — честные цены и прозрачные сделки.
          </p>
        </div>

        {/* Search form */}
        <div className="max-w-4xl rounded-2xl bg-white/10 p-2 backdrop-blur-xl sm:p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="rounded-xl bg-white px-4 py-3.5 text-sm font-medium text-dark-light outline-none"
              aria-label="Выберите марку"
            >
              <option value="">Марка авто</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Цена от"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              className="rounded-xl bg-white px-4 py-3.5 text-sm font-medium text-dark-light outline-none placeholder:text-gray-text"
              aria-label="Цена от"
            />

            <input
              type="text"
              placeholder="Цена до"
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
              className="rounded-xl bg-white px-4 py-3.5 text-sm font-medium text-dark-light outline-none placeholder:text-gray-text"
              aria-label="Цена до"
            />

            <select
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value)}
              className="rounded-xl bg-white px-4 py-3.5 text-sm font-medium text-dark-light outline-none"
              aria-label="Выберите кузов"
            >
              <option value="">Тип кузова</option>
              {bodyTypes.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-primary-dark hover:shadow-lg"
              aria-label="Найти автомобили"
            >
              <Search className="h-4 w-4" />
              Найти
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
