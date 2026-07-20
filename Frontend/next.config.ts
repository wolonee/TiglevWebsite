import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка в self-contained сервер для компактного Docker-образа
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
