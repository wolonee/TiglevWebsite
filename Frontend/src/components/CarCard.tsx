"use client";

import { ArrowRight, Camera, Check, ChevronLeft, ChevronRight, Cog, Cylinder, Fuel, Gauge, Grid2x2, MapPin, Zap } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Car } from "@/data/cars";
import { formatPrice } from "@/data/cars";
import { getCarGallery } from "@/data/carGallery";
import { imageObjectPosition } from "@/data/carImages";
import { imageVariants } from "@/data/imageVariants";
import { displayDrive, displayWord, sourceBadge, OWN_SOURCE } from "@/data/catalogSource";

type CarCardProps = {
  car: Car;
  preloadCover?: boolean;
};

// 1 колонка на телефоне, 2 на планшете, 3 на десктопе.
const catalogImageSizes = "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw";

type IconType = ComponentType<{ className?: string }>;
type Spec = { icon: IconType; label: string; value: string };

// "150" → "150 л.с.", но "150 л.с." оставляем как есть.
const withUnit = (value: string, unit: string) =>
  /[а-яa-z]/i.test(value) ? value : `${value} ${unit}`.trim();

function buildSpecs(car: Car): Spec[] {
  const specs: (Spec | null)[] = [
    car.mileage != null ? { icon: Gauge, label: "Пробег", value: `${car.mileage.toLocaleString("ru-RU")} км` } : null,
    car.fuel ? { icon: Fuel, label: "Двигатель", value: displayWord(car.fuel)! } : null,
    car.power ? { icon: Zap, label: "Мощность", value: withUnit(car.power, "л.с.") } : null,
    car.engineVolume ? { icon: Cylinder, label: "Объём", value: withUnit(car.engineVolume, "л") } : null,
    car.transmission ? { icon: Cog, label: "Коробка", value: displayWord(car.transmission)! } : null,
    displayDrive(car.drive) ? { icon: Grid2x2, label: "Привод", value: displayDrive(car.drive)! } : null,
  ];
  return specs.filter((spec): spec is Spec => spec !== null);
}

// bodyType используется как второй элемент подзаголовка; "другое" — мусорное
// значение из CarClick, его не показываем.
function subtitle(car: Car): string {
  const extra = car.bodyType && car.bodyType.toLowerCase() !== "другое" ? car.bodyType : "";
  return `${car.year} г.${extra ? ` · ${extra}` : ""}`;
}

/**
 * Насколько далеко от экрана карточка ещё держит фотографию.
 *
 * Лента бесконечная, и фотографии CarClick — 1024×768. На диске это 20–40 КБ,
 * но в памяти браузера каждая занимает 1024 × 768 × 4 байта = 3 МБ: вес
 * распакованного растра считается по пикселям, а не по файлу. Триста
 * прокрученных карточек — почти гигабайт, и он только растёт.
 *
 * Уехавшая карточка отдаёт фотографию, а рамка `aspect-[16/10]` остаётся на
 * месте — высота не меняется, прокрутка не прыгает. Возврат наверх поднимает
 * картинку из HTTP-кеша, без сети.
 */
const IMAGE_KEEP_MARGIN = "1200px 0px";

const CarCard = ({ car, preloadCover = false }: CarCardProps) => {
  const images = getCarGallery(car);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setHovered] = useState(false);
  // Изначально true, чтобы фотография была в серверной разметке: первый экран
  // должен приезжать с картинками, а не дорисовывать их после гидратации.
  const [keepsImage, setKeepsImage] = useState(true);
  const frame = useRef<HTMLDivElement>(null);
  const cover = images[activeIndex] ?? images[0];

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setKeepsImage(entry.isIntersecting),
      { rootMargin: IMAGE_KEEP_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Без useCallback: в проекте включён React Compiler, он мемоизирует сам,
  // а ручная мемоизация ему мешает и отключает оптимизацию всего компонента.
  const step = (direction: number) =>
    setActiveIndex((current) => (current + direction + images.length) % images.length);

  // Стрелки клавиатуры листают ту карточку, на которой сейчас курсор.
  useEffect(() => {
    if (!isHovered || images.length < 2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      setActiveIndex((current) => (current + direction + images.length) % images.length);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isHovered, images.length]);
  const specs = buildSpecs(car);
  // Своя машина стоит в Тольятти — её можно забрать сегодня, и «под ключ»
  // здесь ничего не сообщает. «В наличии» — это и есть преимущество.
  const priceSub =
    (car.source ?? OWN_SOURCE) === OWN_SOURCE
      ? "в наличии"
      : car.deliveryTime
        ? `под ключ · доставка ${car.deliveryTime} дн`
        : "под ключ";
  const badge = sourceBadge(car.source, car.country);
  // Фото CarClick лежат на их S3 уже в WebP ~30 КБ — оптимизатор Next им не нужен.
  const isExternalCover = cover?.url?.startsWith("http") ?? false;

  return (
    <Link
      href={`/catalog/${car.id}`}
      aria-label={`Подробнее о ${car.brand} ${car.model}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-text/30 hover:shadow-lg"
    >
      <div ref={frame} className="relative aspect-[16/10] overflow-hidden bg-gray-bg">
        {cover?.url && keepsImage ? (
          <Image
            src={cover.url}
            alt={`${car.brand} ${car.model} ${car.year}`}
            className="h-full w-full object-cover transition-transform duration-700 ease-out will-change-transform md:group-hover:scale-[1.05]"
            fill
            priority={preloadCover}
            unoptimized={isExternalCover}
            quality={imageVariants.catalog.quality}
            sizes={catalogImageSizes}
            style={{ objectPosition: imageObjectPosition(cover) }}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-dark/25 via-transparent to-transparent" />

        <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm ${
              badge.tone === "available" ? "bg-emerald-600/90" : "bg-dark/60"
            }`}
          >
            {badge.tone === "available" ? <Check className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            {badge.label}
          </span>
          {car.condition === "new" ? (
            <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
              Новый
            </span>
          ) : null}
        </div>

        {images.length > 1 ? (
          <>
            {/*
              Кнопки внутри ссылки: без preventDefault клик по стрелке уводил бы
              на страницу лота вместо перелистывания. На тач-устройствах показаны
              всегда — там нет наведения.
            */}
            {([
              { dir: -1, Icon: ChevronLeft, side: "left-1", label: "Предыдущее фото" },
              { dir: 1, Icon: ChevronRight, side: "right-1", label: "Следующее фото" },
            ] as const).map(({ dir, Icon, side, label }) => (
              <button
                key={label}
                type="button"
                aria-label={`${label} ${car.brand} ${car.model}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  step(dir);
                }}
                className={`absolute ${side} top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-dark/45 text-white backdrop-blur-sm transition-all duration-200 hover:bg-dark/70 active:scale-95 md:opacity-0 md:group-hover:opacity-100`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </>
        ) : null}

        {images.length > 1 ? (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg bg-dark/60 px-2 py-1 text-xs font-semibold text-white tabular-nums backdrop-blur-sm">
            <Camera className="h-3 w-3 opacity-85" />
            {activeIndex + 1} / {images.length}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-bold leading-tight text-dark">
            {car.brand} {car.model}
          </h3>
          <p className="text-sm text-gray-text">{subtitle(car)}</p>
        </div>

        {specs.length > 0 ? (
          <div className="grid grid-cols-3 gap-x-2 gap-y-3">
            {specs.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex min-w-0 items-center gap-1.5">
                <Icon className="h-[17px] w-[17px] shrink-0 text-primary" />
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[13px] font-semibold text-dark tabular-nums">{value}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-text">{label}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-auto border-t border-gray-border pt-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start sm:gap-0">
              <span className="text-lg font-extrabold text-dark tabular-nums sm:text-xl">
                {formatPrice(car.price)}
              </span>
              <span className="text-[11px] text-gray-text">{priceSub}</span>
            </div>
            <span className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-dark px-4 text-sm font-semibold text-white transition-colors duration-300 group-hover:bg-primary sm:h-9 sm:w-auto sm:text-[13px]">
              Подробнее
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CarCard;
