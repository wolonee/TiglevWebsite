import {
  Calendar,
  CarFront,
  Cog,
  Fuel,
  Gauge,
  Grid2x2,
  Layers,
  MapPin,
  Navigation,
  Package,
  Palette,
  Settings2,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Car } from "@/data/cars";

/**
 * Характеристики плиткой с иконками, а не таблицей «подпись — значение».
 *
 * Взгляд уже привык к этому виду в карточке каталога: значение крупно, подпись
 * мелко под ним. В таблице на всю ширину страницы подпись и значение
 * расходятся по краям, и глазу приходится каждый раз проходить всю строку.
 *
 * Пустые поля не рисуем вовсе: прочерк выглядит как потерянные данные, хотя у
 * своих машин половины полей CarClick просто нет.
 */

type Spec = { icon: LucideIcon; label: string; value: string };

/** «252» → «252 л.с.». Единицы у источника не приходят. */
const power = (value?: string) =>
  !value ? undefined : /л\.?\s?с/i.test(value) ? value : `${value} л.с.`;

const condition = (value?: Car["condition"]) =>
  value === "new" ? "Новый" : value === "used" ? "С пробегом" : undefined;

export function carSpecs(car: Car): Spec[] {
  return (
    [
      [Gauge, "Пробег", car.mileage == null ? undefined : `${car.mileage.toLocaleString("ru-RU")} км`],
      [Fuel, "Двигатель", car.engine],
      [Zap, "Мощность", power(car.power)],
      [Cog, "Объём", car.engineVolume],
      [Settings2, "Коробка", car.transmission],
      [Grid2x2, "Привод", car.drive],
      [Calendar, "Год выпуска", car.year ? `${car.year} год` : undefined],
      [CarFront, "Тип кузова", car.bodyType],
      [Sparkles, "Состояние", condition(car.condition)],
      [Layers, "Поколение", car.generation],
      [Package, "Комплектация", car.equipment],
      [Palette, "Цвет", car.color],
      [Navigation, "Руль", car.wheel],
      [MapPin, "Страна", car.country],
      [Wrench, "Повреждения кузова", car.damage],
    ] as [LucideIcon, string, string | undefined][]
  )
    .filter((spec): spec is [LucideIcon, string, string] => Boolean(spec[2]))
    .map(([icon, label, value]) => ({ icon, label, value }));
}

export default function CarSpecs({ car }: { car: Car }) {
  const specs = carSpecs(car);
  if (!specs.length) return null;

  return (
    <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {specs.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex min-w-0 items-center gap-3">
          <Icon className="h-[18px] w-[18px] shrink-0 text-primary" />
          <div className="min-w-0">
            <dd className="text-[15px] font-semibold text-dark">{value}</dd>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-text">{label}</dt>
          </div>
        </div>
      ))}
    </dl>
  );
}
