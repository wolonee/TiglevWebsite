"use client";

import { Calendar, ChevronLeft, ChevronRight, Fuel } from "lucide-react";
import type { Car } from "@/data/cars";
import { formatPrice } from "@/data/cars";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getCarGallery } from "@/data/carGallery";

type CarCardProps = {
  car: Car;
};

const CarCard = ({ car }: CarCardProps) => {
  const images = getCarGallery(car);
  const [activeImage, setActiveImage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const stepImage = useCallback((direction: number) => setActiveImage((current) => (current + direction + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (!isHovered) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        stepImage(event.key === "ArrowLeft" ? -1 : 1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isHovered, stepImage]);

  return (
    <article onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-border bg-white transition-[transform,box-shadow,border-color] duration-300 ease-out will-change-transform hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-xl focus-within:-translate-y-1.5 focus-within:shadow-xl">
      <Link
        href={`/catalog/${car.id}`}
        aria-label={`Подробнее о ${car.brand} ${car.model}`}
        className="absolute inset-0 z-10 rounded-2xl"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            stepImage(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      />
      <div className="pointer-events-none relative z-20 aspect-[16/10] overflow-hidden bg-gray-bg">
        <Image
          src={images[activeImage]}
          alt={`${car.brand} ${car.model} ${car.year}`}
          className="h-full w-full object-cover transition-transform duration-700 ease-out will-change-transform group-hover:scale-[1.06]"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); stepImage(-1); }} aria-label={`Предыдущее фото ${car.brand} ${car.model}`} className="pointer-events-auto absolute left-3 top-1/2 z-30 -translate-y-1/2 rounded-full bg-dark/60 p-2 text-white opacity-0 backdrop-blur transition-opacity hover:bg-dark/80 group-hover:opacity-100 focus:opacity-100"><ChevronLeft className="h-4 w-4"/></button>
        <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); stepImage(1); }} aria-label={`Следующее фото ${car.brand} ${car.model}`} className="pointer-events-auto absolute right-3 top-1/2 z-30 -translate-y-1/2 rounded-full bg-dark/60 p-2 text-white opacity-0 backdrop-blur transition-opacity hover:bg-dark/80 group-hover:opacity-100 focus:opacity-100"><ChevronRight className="h-4 w-4"/></button>
        <span className="absolute bottom-3 right-3 rounded-lg bg-dark/65 px-2.5 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">{activeImage + 1} / {images.length}</span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-dark">
            {car.brand} {car.model}
          </h3>
          <span className="shrink-0 rounded-md bg-gray-bg px-2 py-0.5 text-xs font-medium text-gray-text">
            {car.bodyType}
          </span>
        </div>

        <div className="mb-4 flex items-center gap-4 text-sm text-gray-text">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {car.year} г.
          </span>
          <span className="flex items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5" />
            {car.engine}
          </span>
        </div>

        {car.description && (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-text">
            {car.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-gray-border pt-4">
          <p className="text-xl font-extrabold text-dark">
            {formatPrice(car.price)}
          </p>
          <span
            className="rounded-lg bg-dark px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary hover:shadow-md active:scale-[0.97]"
          >
            Подробнее
          </span>
        </div>
      </div>
    </article>
  );
};

export default CarCard;
