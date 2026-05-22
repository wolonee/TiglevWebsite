import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка в self-contained сервер для компактного Docker-образа
  output: "standalone",
};

export default nextConfig;
