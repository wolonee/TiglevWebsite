"use client";

import { MapPin, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Car } from "@/data/cars";
import { formatPrice } from "@/data/cars";
import { CONTACT_DETAILS } from "@/data/contactDetails";
import { OWN_SOURCE } from "@/data/catalogSource";
import Button from "./ui/Button";
import LeadDialog from "./LeadDialog";
import MessengerLinks from "./MessengerLinks";

/**
 * Блок сделки на странице автомобиля.
 *
 * Здесь же живёт заголовок страницы: отдельной шапки над галереей нет. Она
 * повторяла год и тип кузова, которые и так стоят в «Характеристиках», а
 * человек, открывший карточку, и без подписи видит, какую машину смотрит.
 *
 * Содержимое — только про покупку: цена, кто её платит, откуда и за сколько
 * дней приедет машина. Пробег, мощность и год отсюда убраны: они в
 * «Характеристиках», и повторять их значит превращать блок во второй список
 * параметров.
 *
 * Расчёт кредита не показываем: машины идут через партнёра, кредит мы не
 * оформляем, и калькулятор обещал бы услугу, которой нет. Номера телефона тоже
 * нет — звонок требует говорить сейчас, а переписку можно продолжить через час.
 *
 * Цену юрлица показываем только когда она заполнена: у большинства лотов там
 * ноль, и «0 ₽» рядом с пятью миллионами читается как ошибка сайта.
 */

type CarDealPanelProps = {
  car: Car;
  /** Цена для юридического лица, если источник её указал. */
  priceLegal?: number;
};

type Pill = { label: string; icon?: React.ReactNode; tone: "neutral" | "accent" | "good" };

const PILL_TONES: Record<Pill["tone"], string> = {
  neutral: "bg-gray-bg text-dark",
  accent: "bg-red-50 text-primary",
  good: "bg-green-50 text-green-700",
};

export default function CarDealPanel({ car, priceLegal }: CarDealPanelProps) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isPanelVisible, setPanelVisible] = useState(true);
  const panel = useRef<HTMLElement>(null);

  // Блок сделки на странице один, и на «Характеристиках» он уже далеко вверху.
  // Пока его не видно, кнопку заявки держим внизу экрана телефона.
  useEffect(() => {
    const node = panel.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const isOwn = (car.source ?? OWN_SOURCE) === OWN_SOURCE;

  const pills: Pill[] = isOwn
    ? [{ label: "В наличии в Тольятти", tone: "good" }]
    : (
        [
          car.country
            ? { label: car.country, icon: <MapPin className="h-3.5 w-3.5" />, tone: "neutral" as const }
            : null,
          car.deliveryTime
            ? {
                label: `${car.deliveryTime} дней`,
                icon: <Truck className="h-3.5 w-3.5" />,
                tone: "accent" as const,
              }
            : null,
          car.condition === "new" ? { label: "Новый", tone: "good" as const } : null,
        ] as (Pill | null)[]
      ).filter((pill): pill is Pill => pill !== null);

  // Незаполненная строка выпадает целиком: «Отправление —» выглядит как
  // потерянные данные.
  const line = (label: string, value?: string | null) => (value ? { label, value } : null);
  const lines = (
    isOwn
      ? [
          line("Где посмотреть", CONTACT_DETAILS.address),
          line("Часы работы", CONTACT_DETAILS.workHours[0].replace("Будние дни: ", "будни ")),
        ]
      : [
          line("Срок доставки", car.deliveryTime ? `${car.deliveryTime} дней` : null),
          line("Отправление", car.country),
          line("Цена для юрлица", priceLegal ? formatPrice(priceLegal) : null),
        ]
  ).filter((item): item is { label: string; value: string } => item !== null);

  return (
    <>
      <section
        ref={panel}
        data-testid="deal-panel"
        className="rounded-2xl border border-gray-border bg-white p-5 sm:p-6"
      >
        {pills.length ? (
          <div className="flex flex-wrap gap-2">
            {pills.map((pill) => (
              <span
                key={pill.label}
                className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${PILL_TONES[pill.tone]}`}
              >
                {pill.icon}
                {pill.label}
              </span>
            ))}
          </div>
        ) : null}

        <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-dark">
          {car.brand} {car.model}
        </h1>

        <p className="mt-4 text-[1.75rem] font-extrabold leading-none tracking-tight text-dark">
          {formatPrice(car.price)}
        </p>
        {/* У своей машины подписи нет: «в наличии» уже сказано меткой выше. */}
        {isOwn ? null : <p className="mt-2 text-sm text-gray-text">Цена под ключ для физического лица</p>}

        <Button size="lg" block className="mt-5" onClick={() => setDialogOpen(true)}>
          Оставить заявку
        </Button>
        <MessengerLinks car={car} className="mt-2" hint />

        <div className="mt-5 border-t border-gray-border pt-2">
          <dl>
            {lines.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4 border-b border-gray-border py-3 text-sm last:border-0"
              >
                <dt className="text-gray-text">{label}</dt>
                <dd className="text-right font-semibold text-dark">{value}</dd>
              </div>
            ))}
          </dl>
          {isOwn ? null : (
            <p className="mt-3 text-xs leading-relaxed text-gray-text">
              Итоговую стоимость с учётом курса и таможенных платежей на день заказа
              подтверждает менеджер.
            </p>
          )}
        </div>
      </section>

      {/*
        Полосу именно размонтируем, а не прячем сдвигом: спрятанная кнопка
        остаётся в разметке, ловит фокус с клавиатуры и перекрывает низ страницы.
      */}
      {isPanelVisible ? null : (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-gray-border bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <span className="min-w-0 flex-1 truncate text-lg font-extrabold text-dark">{formatPrice(car.price)}</span>
          <Button size="lg" onClick={() => setDialogOpen(true)}>
            Оставить заявку
          </Button>
        </div>
      )}

      <LeadDialog car={car} open={isDialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
