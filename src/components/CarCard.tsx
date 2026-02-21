import { Calendar, Fuel, Eye } from "lucide-react";
import type { Car } from "@/data/cars";
import { formatPrice } from "@/data/cars";

type CarCardProps = {
  car: Car;
};

const CarCard = ({ car }: CarCardProps) => {
  return (
    <article className="group overflow-hidden rounded-2xl border border-gray-border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-bg">
        <img
          src={car.image}
          alt={`${car.brand} ${car.model} ${car.year}`}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute top-3 left-3 flex gap-2">
          {car.fast && (
            <span className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
              Срочно
            </span>
          )}
          {car.elite && (
            <span className="rounded-lg bg-gradient-to-r from-primary to-primary-dark px-2.5 py-1 text-xs font-bold text-white shadow-sm">
              Элитное
            </span>
          )}
        </div>

        <div className="absolute right-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-dark backdrop-blur-sm transition-colors hover:bg-white"
            aria-label={`Быстрый просмотр ${car.brand} ${car.model}`}
          >
            <Eye className="h-3.5 w-3.5" />
            Просмотр
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-dark">
            {car.brand} {car.model}
          </h3>
          <span className="shrink-0 rounded-md bg-gray-bg px-2 py-0.5 text-xs font-medium text-gray-text">
            {car.bodyType}
          </span>
        </div>

        <div className="mb-4 flex items-center gap-4 text-sm text-gray-text">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {car.year} г.
          </span>
          <span className="flex items-center gap-1.5">
            <Fuel className="h-3.5 w-3.5" />
            {car.engine}
          </span>
        </div>

        {car.description && (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-text">
            {car.description}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-gray-border pt-4">
          <p className="text-xl font-extrabold text-dark">
            {formatPrice(car.price)}
          </p>
          <button
            type="button"
            className="rounded-lg bg-dark px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary hover:shadow-md active:scale-[0.97]"
            aria-label={`Подробнее о ${car.brand} ${car.model}`}
          >
            Подробнее
          </button>
        </div>
      </div>
    </article>
  );
};

export default CarCard;
