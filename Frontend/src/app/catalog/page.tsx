import { redirect } from "next/navigation";

type CatalogPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  redirect(params.size ? `/?${params.toString()}#catalog` : "/#catalog");
}
