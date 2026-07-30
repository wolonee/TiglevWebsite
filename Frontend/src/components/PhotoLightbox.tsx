"use client";

import Image from "next/image";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";
import type { CarImage } from "@/data/carImages";
import { imageVariants } from "@/data/imageVariants";

type PhotoLightboxProps = {
  activeIndex: number;
  alt: string;
  images: CarImage[];
  onOpenChange: (open: boolean) => void;
  onStep: (direction: number) => void;
  open: boolean;
};

export default function PhotoLightbox({ activeIndex, alt, images, onOpenChange, onStep, open }: PhotoLightboxProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        onStep(event.key === "ArrowLeft" ? -1 : 1);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onStep, open]);

  const image = images[activeIndex];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-dark/90 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-3 z-[121] flex items-center justify-center outline-none sm:inset-6">
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          <div className="relative h-full w-full">
            <Image src={image.url} alt={alt} fill priority quality={imageVariants.full.quality} sizes={imageVariants.full.lightboxSizes} className="object-contain" />

            <DialogPrimitive.Close asChild>
              <button type="button" aria-label="Закрыть просмотр фотографии" className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-dark/35 text-white/95 backdrop-blur-sm transition-[background-color,transform] hover:bg-dark/65 focus-visible:bg-dark/65 active:scale-95 sm:right-3 sm:top-3">
                <X className="h-5 w-5" />
              </button>
            </DialogPrimitive.Close>

            {images.length > 1 && <>
              <button type="button" onClick={() => onStep(-1)} aria-label="Предыдущее фото" className="absolute left-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-dark/35 text-white/95 backdrop-blur-sm transition-[background-color,transform] hover:bg-dark/65 focus-visible:bg-dark/65 active:scale-95 sm:left-3">
                <ChevronLeft />
              </button>
              <button type="button" onClick={() => onStep(1)} aria-label="Следующее фото" className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-dark/35 text-white/95 backdrop-blur-sm transition-[background-color,transform] hover:bg-dark/65 focus-visible:bg-dark/65 active:scale-95 sm:right-3">
                <ChevronRight />
              </button>
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-lg bg-dark/55 px-3 py-1.5 text-xs font-medium text-white sm:bottom-3">
                {activeIndex + 1} / {images.length}
              </span>
            </>}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
