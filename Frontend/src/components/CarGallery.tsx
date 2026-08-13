"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { CarImage } from "@/data/carImages";
import { imageVariants } from "@/data/imageVariants";

const PhotoLightbox = dynamic(() => import("./PhotoLightbox"), { ssr: false });

type CarGalleryProps = {
  images: CarImage[];
  alt: string;
  /**
   * Галерея занимает всю ширину страницы, а не колонку.
   *
   * Пропорции 4:3 на всю ширину дают кадр под тысячу пикселей высотой —
   * страница начинается с одной фотографии, и до цены надо прокручивать.
   * В широком режиме кадр приземистее (16:10) и заполняется целиком: серые
   * поля по бокам от вписанной фотографии занимали больше места, чем машина.
   * Полный кадр никуда не девается — он в миниатюрах и в лайтбоксе.
   */
  wide?: boolean;
};

export default function CarGallery({ images, alt, wide = false }: CarGalleryProps) {
  const [active, setActive] = useState(0);
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const step = useCallback(
    (direction: number) => setActive((current) => (current + direction + images.length) % images.length),
    [images.length],
  );

  useEffect(() => {
    if (lightboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        step(event.key === "ArrowLeft" ? -1 : 1);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, step]);

  const sizes = wide ? imageVariants.full.wideGallerySizes : imageVariants.full.gallerySizes;
  const neighbours = images.length < 2
    ? []
    : [...new Set([(active + 1) % images.length, (active - 1 + images.length) % images.length])]
        .filter((index) => index !== active)
        .map((index) => images[index]);

  return (
    <div className="min-w-0">
      <div
        className={`relative overflow-hidden rounded-[20px] border border-gray-border bg-gray-bg ${
          wide ? "aspect-[4/3] sm:aspect-[16/10]" : "aspect-[4/3]"
        }`}
      >
        <button type="button" onClick={() => setLightboxOpen(true)} aria-label={`Открыть фото ${active + 1} в полном размере`} className="absolute inset-0 cursor-zoom-in">
          <Image src={images[active].url} alt={alt} fill priority quality={imageVariants.full.quality} onLoad={() => setGalleryLoaded(true)} sizes={sizes} className={wide ? "object-cover" : "object-contain"} />
        </button>
        {/*
          Заранее греем только соседние кадры, а не всю галерею. Раньше здесь
          висели все фотографии лота разом: на диске это копейки, но в памяти
          распакованный кадр занимает ширина × высота × 4 байта, и два десятка
          снимков съедали десятки мегабайт ради перелистывания на один шаг.
        */}
        {galleryLoaded && neighbours.map((image) => (
          <Image key={image.url} src={image.url} alt="" aria-hidden fill loading="eager" fetchPriority="low" quality={imageVariants.full.quality} sizes={sizes} className="pointer-events-none opacity-0" />
        ))}
        {images.length > 1 && <><button onClick={() => step(-1)} aria-label="Предыдущее фото" className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-dark/35 text-white/95 backdrop-blur-sm transition-[background-color,transform] hover:bg-dark/65 focus-visible:bg-dark/65 active:scale-95"><ChevronLeft /></button>
        <button onClick={() => step(1)} aria-label="Следующее фото" className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-dark/35 text-white/95 backdrop-blur-sm transition-[background-color,transform] hover:bg-dark/65 focus-visible:bg-dark/65 active:scale-95"><ChevronRight /></button></>}
        <span className="absolute bottom-3 right-3 rounded-lg bg-dark/65 px-3 py-1.5 text-xs text-white">{active + 1} / {images.length}</span>
      </div>
      <div className={`mt-3 flex snap-x gap-2 overflow-x-auto pb-1 sm:grid sm:overflow-visible sm:pb-0 ${wide ? "sm:grid-cols-6 lg:grid-cols-8" : "sm:grid-cols-6"}`}>
        {images.map((image, index) => (
          <button key={image.url} onClick={() => setActive(index)} aria-label={`Фото ${index + 1}`} className={`relative aspect-square w-16 shrink-0 snap-start overflow-hidden rounded-xl border-2 sm:w-auto ${index === active ? "border-primary" : "border-gray-border"}`}>
            <Image src={image.url} alt="" fill quality={imageVariants.thumbnail.quality} sizes={imageVariants.thumbnail.gallerySizes} className="object-cover" style={{ objectPosition: `${image.position.x}% ${image.position.y}%` }} />
          </button>
        ))}
      </div>
      {lightboxOpen && <PhotoLightbox activeIndex={active} alt={alt} images={images} open={lightboxOpen} onOpenChange={setLightboxOpen} onStep={step} />}
    </div>
  );
}
