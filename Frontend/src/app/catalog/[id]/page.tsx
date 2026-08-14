import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import SitePage from "@/components/SitePage";
import CarGallery from "@/components/CarGallery";
import CarDealPanel from "@/components/CarDealPanel";
import CarSpecs from "@/components/CarSpecs";
import VehicleSchema from "@/components/VehicleSchema";
import LandingView, { landingMetadata } from "@/components/LandingView";
import { findLanding, landingPages } from "@/data/landings";
import { formatPrice, getCar, getCatalogCars } from "@/data/cars";
import { fetchLot, type LotOption } from "@/data/catalogRepo";
import { getCarGallery } from "@/data/carGallery";
import { fetchMessengerChannels } from "@/data/messengerChannels";
import { OWN_SOURCE } from "@/data/catalogSource";
import { carSpecs } from "@/components/CarSpecs";
import { fromCountry, pageTitle } from "@/lib/seo";

export const revalidate = 900;
export const dynamicParams = true;

export async function generateStaticParams() {
  // Заранее собираем свои машины и посадочные страницы-сегменты: 83 тысячи
  // страниц каталога CarClick на сборке не построить, они рендерятся по запросу.
  const cars = await getCatalogCars();
  return [
    ...cars.map((car) => ({ id: car.id })),
    ...landingPages().filter((page) => !page.slug.includes("/")).map((page) => ({ id: page.slug })),
  ];
}

/**
 * Лоты CarClick живут под `cc-<id>`, свои машины — под собственными слагами.
 *
 * Через `cache`, потому что за лотом приходят дважды: сначала `generateMetadata`
 * за заголовком, потом сама страница. Без кеша это два одинаковых запроса в базу
 * на каждый показ карточки.
 */
const loadCar = cache(async (id: string): Promise<{
  car: Awaited<ReturnType<typeof getCar>>;
  options: LotOption[];
  priceLegal?: number;
}> => {
  const carclickId = id.startsWith("cc-") ? Number(id.slice(3)) : null;
  if (carclickId != null && Number.isFinite(carclickId)) {
    const lot = await fetchLot(carclickId);
    return { car: lot?.car, options: lot?.options ?? [], priceLegal: lot?.priceLegal };
  }
  return { car: await getCar(id), options: [] };
});

/**
 * Заголовок и описание собираются из данных лота.
 *
 * До этого страница автомобиля приходила в поиск безымянной — с общим
 * заголовком сайта из layout. Описание берём из тех же характеристик, что
 * показаны на экране: это единственное, что делает 83 тысячи карточек хоть
 * сколько-то различимыми между собой.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  // Сегменты — тоже один сегмент пути, и Next отдаёт их сюда, а не в `[...slug]`.
  const landing = findLanding(id);
  if (landing) return landingMetadata(landing);

  const { car } = await loadCar(id);
  if (!car) return { title: pageTitle("Автомобиль не найден") };

  const name = [car.brand, car.model, car.year || null].filter(Boolean).join(" ");
  const isOwn = (car.source ?? OWN_SOURCE) === OWN_SOURCE;
  const offer = isOwn
    ? `в наличии в Тольятти за ${formatPrice(car.price)}`
    : `${fromCountry(car.country)}под заказ за ${formatPrice(car.price)}`;

  // Характеристики те же, что в блоке на странице, — первые шесть самых понятных.
  const specs = carSpecs(car).slice(0, 6).map((spec) => spec.value).join(", ");
  const delivery = !isOwn && car.deliveryTime ? ` Доставка ${car.deliveryTime} дней.` : "";

  return {
    title: pageTitle(`${name} — ${offer}`),
    description: `${name}: ${specs}. Цена ${isOwn ? "" : "под ключ "}${formatPrice(car.price)}.${delivery}`,
    alternates: { canonical: `/catalog/${id}` },
    openGraph: {
      title: `${name} — ${offer}`,
      type: "website",
      locale: "ru_RU",
      images: car.image ? [{ url: car.image }] : undefined,
    },
  };
}

const Divider = () => <div className="h-px bg-gray-border" />;

/**
 * Страница автомобиля.
 *
 * Порядок блоков идёт за порядком вопросов покупателя: как выглядит → сколько
 * стоит и когда приедет → что внутри → что написал продавец.
 *
 * Шапки с названием над галереей нет. Она повторяла год и тип кузова, которые
 * стоят в «Характеристиках», а до фотографий — ради которых страницу и
 * открывают — приходилось прокручивать. Заголовок страницы живёт в блоке сделки.
 *
 * «Описание» показываем только когда текст есть. У импортных лотов он заполнен
 * меньше чем у процента машин, и пустой заголовок выглядел бы как поломка.
 */
export default async function CarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;

  const landing = findLanding(id);
  if (landing) return <LandingView page={landing} searchParams={await searchParams} />;

  // Каналы связи параллельно с лотом: это два независимых запроса, и ждать
  // их по очереди значит удвоить задержку карточки.
  const [{ car, options, priceLegal }, channels] = await Promise.all([
    loadCar(id),
    fetchMessengerChannels(),
  ]);
  if (!car) notFound();

  const optionGroups = Object.entries(
    options.reduce<Record<string, string[]>>((groups, option) => {
      const title = option.group ?? "Прочее";
      (groups[title] ??= []).push(option.name);
      return groups;
    }, {}),
  );

  return (
    <SitePage>
      <VehicleSchema car={car} />
      <section className="section-space pt-24 sm:pt-28">
        {/* Отступ снизу — под плавающую кнопку заявки на телефоне. */}
        <div className="shell pb-20 lg:pb-0">
          <Link href="/#catalog" className="inline-flex items-center gap-2 text-sm text-gray-text hover:text-primary">
            <ArrowLeft size={16} />
            Назад в каталог
          </Link>

          {/*
            Явные строки и колонки, а не два вложенных блока: на телефоне блок
            сделки должен идти сразу за фотографиями, а не после списка опций.
            В одной колонке порядок разметки и есть порядок на экране.
          */}
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_.65fr] lg:gap-10">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <CarGallery images={getCarGallery(car)} alt={`${car.brand} ${car.model}`} wide />
            </div>

            <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              {/* Блок сделки едет за прокруткой: цена и кнопка остаются на
                  экране, пока человек листает опции. */}
              <div className="lg:sticky lg:top-24">
                <CarDealPanel car={car} priceLegal={priceLegal} channels={channels} />
              </div>
            </div>

            <div className="min-w-0 space-y-7 sm:space-y-9 lg:col-start-1 lg:row-start-2">
              <Divider />
              <div>
                <h2 className="mb-5 text-lg font-extrabold text-dark">Характеристики</h2>
                <CarSpecs car={car} />
              </div>

              {optionGroups.length ? (
                <>
                  <Divider />
                  <div>
                    <h2 className="mb-5 text-lg font-extrabold text-dark">
                      Комплектация{" "}
                      <span className="text-sm font-semibold text-gray-text">· {options.length} опций</span>
                    </h2>
                    {/* Опции сгруппированы так же, как их отдаёт источник: искать глазами проще. */}
                    <div className="grid gap-6 sm:grid-cols-2">
                      {optionGroups.map(([title, names]) => (
                        <div key={title}>
                          <h3 className="text-sm font-bold text-dark">{title}</h3>
                          <ul className="mt-2 space-y-1.5">
                            {names.map((name) => (
                              <li key={name} className="flex gap-2 text-sm text-gray-text">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                {name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {car.description ? (
                <>
                  <Divider />
                  <div>
                    <h2 className="mb-4 text-lg font-extrabold text-dark">Описание</h2>
                    <p className="leading-7 text-gray-text">{car.description}</p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
