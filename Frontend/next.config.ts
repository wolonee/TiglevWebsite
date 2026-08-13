import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка в self-contained сервер для компактного Docker-образа
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      // Фотографии каталога CarClick. Отдаются без проверки Referer и без
      // CORS-ограничений, уже в WebP по ~30 КБ — поэтому в карточке они идут
      // с `unoptimized`: платить за ре-оптимизацию уже оптимизированного незачем.
      { protocol: "https", hostname: "s3-api.carclick.ru" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85, 90],
  },
};

export default nextConfig;
