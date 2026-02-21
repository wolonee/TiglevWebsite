import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TIGLEV — Автомобили с пробегом в Тольятти",
  description:
    "Продажа подержанных автомобилей, срочный выкуп и заказ авто из Европы. Тольятти, +7 (8482) 750-750",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
};

export default RootLayout;
