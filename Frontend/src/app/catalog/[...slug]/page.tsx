import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingView, { landingMetadata } from "@/components/LandingView";
import { findLanding, landingPages } from "@/data/landings";

/**
 * Посадочные страницы из двух и трёх сегментов: `/catalog/kia/iz-korei`,
 * `/catalog/kia/carnival/iz-korei`.
 *
 * Односегментные адреса (`/catalog/elektromobili`, `/catalog/kia-sorento-2017`)
 * сюда не попадают: Next отдаёт их более точному `[id]`. Поэтому сегменты
 * обрабатываются там же, где карточки лотов, — оба через общий `LandingView`.
 */
export const revalidate = 86_400;
export const dynamicParams = false;

export function generateStaticParams() {
  return landingPages()
    .map((page) => page.slug.split("/"))
    .filter((slug) => slug.length > 1)
    .map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const page = findLanding((await params).slug.join("/"));
  return page ? landingMetadata(page) : {};
}

export default async function CatalogLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const page = findLanding((await params).slug.join("/"));
  if (!page) notFound();
  return <LandingView page={page} searchParams={await searchParams} />;
}
