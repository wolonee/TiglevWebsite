"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type CarGalleryProps = {
  images: string[];
  alt: string;
};

export default function CarGallery({ images, alt }: CarGalleryProps) {
  const [active, setActive] = useState(0);
  const step = useCallback(
    (direction: number) => setActive((current) => (current + direction + images.length) % images.length),
    [images.length],
  );

  useEffect(() => {
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
  }, [step]);

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-gray-border bg-gray-bg">
        <Image src={images[active]} alt={alt} fill priority unoptimized sizes="(max-width: 1024px) 100vw, 65vw" className="object-cover" />
        <button onClick={() => step(-1)} aria-label="Предыдущее фото" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-dark/60 p-2.5 text-white backdrop-blur"><ChevronLeft /></button>
        <button onClick={() => step(1)} aria-label="Следующее фото" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-dark/60 p-2.5 text-white backdrop-blur"><ChevronRight /></button>
        <span className="absolute bottom-3 right-3 rounded-lg bg-dark/65 px-3 py-1.5 text-xs text-white">{active + 1} / {images.length}</span>
      </div>
      <div className="mt-3 grid grid-cols-6 gap-2">
        {images.map((src, index) => (
          <button key={src} onClick={() => setActive(index)} aria-label={`Фото ${index + 1}`} className={`relative aspect-square overflow-hidden rounded-xl border-2 ${index === active ? "border-primary" : "border-gray-border"}`}>
            <Image src={src} alt="" fill unoptimized sizes="15vw" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
