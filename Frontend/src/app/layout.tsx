import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CONTACT_DETAILS } from "@/data/contactDetails";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  // Без него `alternates.canonical` и Open Graph остаются относительными,
  // а роботу нужен абсолютный адрес.
  metadataBase: new URL(SITE_URL),
  title: "TIGLEV.COM — Автомобили с пробегом в Тольятти",
  description:
    `Продажа подержанных автомобилей, срочный выкуп и заказ авто из Европы. Автосалон в Тольятти с 2009 года. ${CONTACT_DETAILS.phones[0].label}`,
  keywords: [
    "автосалон тольятти",
    "автомобили с пробегом",
    "купить авто тольятти",
    "выкуп авто",
    "авто из европы",
  ],
  openGraph: {
    title: "TIGLEV.COM — Автомобили с пробегом в Тольятти",
    description:
      "Продажа, выкуп и заказ автомобилей. Более 15 лет на рынке — честные цены и прозрачные сделки.",
    type: "website",
    locale: "ru_RU",
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
