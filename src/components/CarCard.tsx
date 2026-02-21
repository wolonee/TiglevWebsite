import { Calendar, Fuel } from "lucide-react";
import type { Car } from "@/data/cars";
import { formatPrice } from "@/data/cars";

type CarCardProps = {
  car: Car;
};

const CarCard = ({ car }: CarCardProps) => {
  return (
    <article className="group overflow-hidden rounded-2xl border border-gray-border bg-white transition-all hover:-translate-y-1 hover:shadow-xl">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-bg">
        <img
          src={car.image}
          alt={`${car.brand} ${car.model}`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {car.fast && (
            <span className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
              Срочно
            </span>
          )}
          {car.elite && (
            <span className="rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-white">
              Элитное
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="mb-1 text-lg font-bold text-dark">
          {car.brand} {car.model}
        </h3>
        <div className="mb-4 flex items-center gap-4 text-sm text-gray-text">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {car.year}
          </span>
          <span className="flex items-center gap-1">
            <Fuel className="h-3.5 w-3.5" />
            {car.engine}
          </span>
          <span>{car.bodyType}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xl font-extrabold text-dark">
            {formatPrice(car.price)}
          </p>
          <button
            type="button"
            className="rounded-lg bg-gray-bg px-4 py-2 text-sm font-semibold text-dark-light transition-all hover:bg-primary hover:text-white"
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
