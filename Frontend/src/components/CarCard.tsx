"use client";

import { Calendar, ChevronLeft, ChevronRight, Fuel } from "lucide-react";
import type { Car } from "@/data/cars";
import { formatPrice } from "@/data/cars";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getCarGallery } from "@/data/carGallery";
import { imageObjectPosition } from "@/data/carImages";

type CarCardProps = {
  car: Car;
  preloadCover?: boolean;
};

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const CarCard = ({ car, preloadCover = false }: CarCardProps) => {
  const images = getCarGallery(car);
  const [activeImage, setActiveImage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [shouldPreloadGallery, setShouldPreloadGallery] = useState(false);
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

  useEffect(() => {
    if (!coverLoaded || images.length < 2) return;

    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
    if (connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") return;

    const preload = () => setShouldPreloadGallery(true);
    const browserWindow = window as IdleCallbackWindow;
    if (typeof browserWindow.requestIdleCallback === "function") {
      const callbackId = browserWindow.requestIdleCallback(preload, { timeout: 1500 });
      return () => browserWindow.cancelIdleCallback?.(callbackId);
    }

    const timeoutId = window.setTimeout(preload, 500);
    return () => window.clearTimeout(timeoutId);
  }, [coverLoaded, images.length]);

  return (
    <article onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-border bg-white sm:rounded-2xl">
      <Link
        href={`/catalog/${car.id}`}
        aria-label={`Подробнее о ${car.brand} ${car.model}`}
        className="absolute inset-0 z-10 rounded-xl sm:rounded-2xl"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            stepImage(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      />
      <div className="pointer-events-none relative z-20 aspect-[16/10] overflow-hidden bg-gray-bg">
        <Image
          src={images[activeImage].url}
          alt={`${car.brand} ${car.model} ${car.year}`}
          className="h-full w-full object-cover transition-transform duration-700 ease-out will-change-transform md:group-hover:scale-[1.06]"
          fill
          preload={preloadCover}
          onLoad={() => { if (activeImage === 0) setCoverLoaded(true); }}
          sizes="(max-width: 639px) 50vw, (max-width: 1024px) 50vw, 33vw"
          style={{ objectPosition: imageObjectPosition(images[activeImage]) }}
        />
        {shouldPreloadGallery && images.slice(1).map((image) => <Image key={image.url} src={image.url} alt="" aria-hidden fill loading="eager" fetchPriority="low" sizes="(max-width: 639px) 50vw, (max-width: 1024px) 50vw, 33vw" className="pointer-events-none opacity-0" />)}
        <div className="absolute inset-0 bg-gradient-to-t from-dark/30 via-transparent to-transparent opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100" />
        {images.length > 1 && <><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); stepImage(-1); }} aria-label={`Предыдущее фото ${car.brand} ${car.model}`} className="pointer-events-auto absolute left-2 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-dark/60 text-white opacity-100 backdrop-blur transition-colors hover:bg-dark/80 sm:left-3 sm:h-11 sm:w-11 md:h-9 md:w-9 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"><ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4"/></button>
        <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); stepImage(1); }} aria-label={`Следующее фото ${car.brand} ${car.model}`} className="pointer-events-auto absolute right-2 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-dark/60 text-white opacity-100 backdrop-blur transition-colors hover:bg-dark/80 sm:right-3 sm:h-11 sm:w-11 md:h-9 md:w-9 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"><ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4"/></button></>}
        {images.length > 1 && <span className="absolute bottom-2 right-2 rounded-md bg-dark/65 px-1.5 py-0.5 text-[10px] text-white opacity-100 transition-opacity sm:bottom-3 sm:right-3 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-xs md:opacity-0 md:group-hover:opacity-100">{activeImage + 1} / {images.length}</span>}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-base font-bold text-dark sm:text-lg">
            {car.brand} {car.model}
          </h3>
          {car.bodyType ? (
            <span className="hidden shrink-0 rounded-md bg-gray-bg px-2 py-0.5 text-xs font-medium text-gray-text sm:inline">
              {car.bodyType}
            </span>
          ) : null}
        </div>

        <div className="mb-3 flex items-center gap-2 text-xs text-gray-text sm:mb-4 sm:gap-4 sm:text-sm">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {car.year} г.
          </span>
          {car.engine ? (
            <span className="hidden items-center gap-1.5 sm:flex">
              <Fuel className="h-3.5 w-3.5" />
              {car.engine}
            </span>
          ) : null}
        </div>

        {car.description && (
          <p className="mb-4 hidden line-clamp-2 text-sm leading-relaxed text-gray-text sm:block">
            {car.description}
          </p>
        )}

        <div className="mt-auto border-t border-gray-border pt-3 sm:flex sm:items-center sm:justify-between sm:pt-4">
          <p className="text-base font-extrabold text-dark sm:text-xl">
            {formatPrice(car.price)}
          </p>
          <span
            className="mt-2 flex justify-center rounded-lg bg-dark px-2.5 py-2 text-xs font-semibold text-white transition-all duration-300 hover:bg-primary hover:shadow-md active:scale-[0.97] sm:mt-0 sm:inline-block sm:px-4 sm:py-2.5 sm:text-sm"
          >
            Подробнее
          </span>
        </div>
      </div>
    </article>
  );
};

export default CarCard;
