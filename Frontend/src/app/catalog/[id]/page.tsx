import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import SitePage from "@/components/SitePage";
import CarGallery from "@/components/CarGallery";
import { formatPrice, getCar, getCatalogCars } from "@/data/cars";
import { getCarGallery } from "@/data/carGallery";

export const revalidate = 900;
export const dynamicParams = true;

export async function generateStaticParams() {
  const cars = await getCatalogCars();
  return cars.map((car) => ({ id: car.id }));
}

export default async function CarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = await getCar(id);
  if (!car) notFound();

  const specs = [
    ["Цена", formatPrice(car.price)],
    ["Двигатель", car.engine],
    ["Объём двигателя", car.engineVolume],
    ["Мощность", car.power],
    ["Трансмиссия", car.transmission],
    ["Пробег", car.mileage == null ? undefined : `${car.mileage.toLocaleString("ru-RU")} км`],
    ["Год выпуска", `${car.year} год`],
    ["Привод", car.drive],
    ["Руль", car.wheel],
    ["Тип кузова", car.bodyType],
    ["Цвет", car.color],
    ["Повреждения кузова", car.damage],
  ].filter((spec): spec is [string, string] => Boolean(spec[1]));
  const summary = [String(car.year), car.bodyType].filter(Boolean).join(" · ");

  return (
    <SitePage>
      <section className="bg-gray-bg pb-9 pt-24 sm:pb-12 sm:pt-28">
        <div className="shell">
          <Link href="/catalog" className="inline-flex items-center gap-2 text-sm text-gray-text hover:text-primary"><ArrowLeft size={16}/>Назад в каталог</Link>
          <div className="mt-6 flex flex-col justify-between gap-3 sm:mt-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-gray-text">{summary}</p>
              <h1 className="mt-1 text-[2rem] font-extrabold tracking-tight text-dark sm:text-4xl">{car.brand} {car.model}</h1>
            </div>
            <p className="text-3xl font-extrabold text-primary">{formatPrice(car.price)}</p>
          </div>
        </div>
      </section>
      <section className="section-space pt-6 sm:pt-10">
        <div className="shell grid gap-5 sm:gap-8 lg:grid-cols-[.7fr_1.3fr]">
          <div className="order-1 lg:order-2"><CarGallery images={getCarGallery(car)} alt={`${car.brand} ${car.model}`}/></div>
          <aside className="order-2 rounded-[20px] border border-gray-border bg-white p-5 sm:p-7 lg:order-1">
            <h2 className="mb-4 text-xl font-bold text-dark">Характеристики</h2>
            {specs.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-gray-border py-3 text-sm last:border-0">
                <span className="text-gray-text">{label}</span>
                <strong className="text-right font-semibold text-dark">{value}</strong>
              </div>
            ))}
          </aside>
          {car.description ? (
            <div className="order-3 lg:col-span-2">
              <h2 className="text-2xl font-bold text-dark">Описание</h2>
              <p className="mt-4 leading-7 text-gray-text">{car.description}</p>
            </div>
          ) : null}
        </div>
      </section>
    </SitePage>
  );
}
