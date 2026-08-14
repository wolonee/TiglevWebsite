import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";
import Analytics from "@/components/Analytics";
import { SiteContentProvider } from "@/components/SiteContentProvider";
import { fetchSiteContent } from "@/data/siteContentServer";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Описание для поиска берёт телефон из админки: он и так меняется там, а два
 * места для одного номера рано или поздно разъезжаются.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { company } = await fetchSiteContent();
  const phone = company.phones[0]?.label ?? "";

  return {
  // Без него `alternates.canonical` и Open Graph остаются относительными,
  // а роботу нужен абсолютный адрес.
    metadataBase: new URL(SITE_URL),
    title: "TIGLEV.COM — Автомобили с пробегом в Тольятти",
    description:
      `Продажа подержанных автомобилей, срочный выкуп и заказ авто из Европы. Автосалон в Тольятти с 2009 года. ${phone}`.trim(),
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
}

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  // Тексты и контакты читаются один раз на всё дерево: шапка и блок сделки
  // работают в браузере и сами до бэкенда не дотянутся.
  const content = await fetchSiteContent();

  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans antialiased">
        <SiteContentProvider value={content}>{children}</SiteContentProvider>
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
