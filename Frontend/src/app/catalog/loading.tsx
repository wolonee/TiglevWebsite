import SitePage, { PageHero } from "@/components/SitePage";

export default function CatalogLoading() {
  return (
    <SitePage>
      <PageHero eyebrow="Каталог" title="Автомобили в наличии" text="Проверенные автомобили с прозрачной историей и готовыми документами" />
      <section className="section-space bg-gray-bg" aria-label="Загружаем автомобили" aria-busy="true">
        <div className="shell">
          <div className="mb-10"><p className="eyebrow">Каталог</p><h2 className="mt-3 text-3xl font-bold text-dark">Автомобили в наличии</h2></div>
          <div className="mb-10 grid gap-3 rounded-[20px] border border-gray-border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-12 rounded-xl bg-gray-bg" />)}
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-gray-border bg-white">
                <div className="aspect-[16/10] animate-pulse bg-gray-border/60" />
                <div className="space-y-4 p-5"><div className="h-5 w-2/3 animate-pulse rounded bg-gray-border"/><div className="h-4 w-1/2 animate-pulse rounded bg-gray-border/70"/><div className="h-12 animate-pulse rounded bg-gray-border/50"/></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SitePage>
  );
}
