export const imageVariants = {
  thumbnail: {
    quality: 75,
    adminSizes: "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw",
    gallerySizes: "(max-width: 639px) 64px, (max-width: 1023px) 16vw, 10vw",
  },
  catalog: {
    quality: 85,
    sizes: "(max-width: 639px) 50vw, (max-width: 1023px) 50vw, 33vw",
  },
  full: {
    quality: 90,
    gallerySizes: "(max-width: 1023px) 100vw, 65vw",
    /** Галерея страницы автомобиля: левая колонка при блоке сделки справа. */
    wideGallerySizes: "(max-width: 1023px) 100vw, 62vw",
    lightboxSizes: "100vw",
  },
} as const;
