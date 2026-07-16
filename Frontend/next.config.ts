import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка в self-contained сервер для компактного Docker-образа
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
