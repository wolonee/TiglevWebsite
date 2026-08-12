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
};

export default function CarGallery({ images, alt }: CarGalleryProps) {
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

  return (
    <div className="min-w-0">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-gray-border bg-gray-bg">
        <button type="button" onClick={() => setLightboxOpen(true)} aria-label={`Открыть фото ${active + 1} в полном размере`} className="absolute inset-0 cursor-zoom-in">
          <Image src={images[active].url} alt={alt} fill priority quality={imageVariants.full.quality} onLoad={() => setGalleryLoaded(true)} sizes={imageVariants.full.gallerySizes} className="object-contain" />
        </button>
        {galleryLoaded && images.filter((_, index) => index !== active).map((image) => (
          <Image key={image.url} src={image.url} alt="" aria-hidden fill loading="eager" fetchPriority="low" quality={imageVariants.full.quality} sizes={imageVariants.full.gallerySizes} className="pointer-events-none opacity-0" />
        ))}
        {images.length > 1 && <><button onClick={() => step(-1)} aria-label="Предыдущее фото" className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-dark/35 text-white/95 backdrop-blur-sm transition-[background-color,transform] hover:bg-dark/65 focus-visible:bg-dark/65 active:scale-95"><ChevronLeft /></button>
        <button onClick={() => step(1)} aria-label="Следующее фото" className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-dark/35 text-white/95 backdrop-blur-sm transition-[background-color,transform] hover:bg-dark/65 focus-visible:bg-dark/65 active:scale-95"><ChevronRight /></button></>}
        <span className="absolute bottom-3 right-3 rounded-lg bg-dark/65 px-3 py-1.5 text-xs text-white">{active + 1} / {images.length}</span>
      </div>
      <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-6 sm:overflow-visible sm:pb-0">
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
