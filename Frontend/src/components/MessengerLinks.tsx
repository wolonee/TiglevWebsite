"use client";

import { useState, useSyncExternalStore } from "react";
import type { Car } from "@/data/cars";
import { leadMessage, messengerLinks, type MessengerChannel } from "@/data/messengers";
import { track } from "./Analytics";

/**
 * Числовой id лота CarClick из строкового id карточки (`cc-467642`).
 * У своих машин id текстовый — им числа нет, и в уведомление уйдёт
 * название без ссылки на каталог CarClick.
 */
const lotIdOf = (car: { id?: string }): number | undefined => {
  const match = /^cc-(\d+)$/.exec(car?.id ?? "");
  return match ? Number(match[1]) : undefined;
};

/**
 * Кнопки перехода в мессенджер с заготовленным сообщением.
 *
 * Стоят под кнопкой заявки в блоке сделки — для тех, кто готов говорить сейчас
 * и не хочет заполнять форму. В самом окне заявки их нет: там осталась только
 * форма с номером, иначе окно предлагает три способа связи вместо одного.
 *
 * Цвета — фирменные, по одной причине: мессенджер узнают по цвету быстрее, чем
 * по подписи. Красным они быть не могут, красная кнопка на экране одна и это
 * «Оставить заявку».
 *
 * Текст сообщения включает ссылку на страницу, поэтому собирается только
 * в браузере: на сервере адреса нет.
 */

type MessengerLinksProps = {
  car: Car;
  /**
   * Каналы связи из админки; приходят с сервера уже готовым списком.
   * Без них берётся запасной набор из переменных окружения.
   */
  channels?: MessengerChannel[];
  /** Пояснение под кнопками. Нужно там, где неочевидно, что текст уже готов. */
  hint?: boolean;
  className?: string;
};

/**
 * Цвет фирменный, но только на знаке — сама кнопка белая.
 *
 * Залитые цветом кнопки под красной «Оставить заявку» перетягивали внимание:
 * рядом с целевым действием оказывались три ярких плашки. И цвета всё равно не
 * различали мессенджеры — Telegram, VK и MAX все синие, три заливки читались
 * одной полосой. На белом знак работает опознавателем, а вес остаётся у заявки.
 */
const MARK_COLORS: Record<string, string> = {
  telegram: "#229ED9",
  // Средний тон градиента из логотипа MAX: он единственный уходит в фиолетовый
  // и отличает кнопку от двух синих соседей.
  max: "#7075DC",
  vk: "#0077FF",
  whatsapp: "#25D366",
};

/** Незнакомый канал из админки рисуем нейтрально, а не наугад чужим цветом. */
const DEFAULT_MARK = "#1f2933";

const TelegramMark = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-[18px] w-[18px]">
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
  </svg>
);

/**
 * Только знак, без слова рядом: на три кнопки в колонке блока сделки приходится
 * около 80 px, и подпись «Telegram» туда не встаёт. У MAX и VK знак — это сами
 * буквы названия, поэтому рисуем их шрифтом, а не приблизительным SVG:
 * кривой самодельный логотип узнаётся хуже, чем честная надпись.
 */
const MARKS: Record<string, React.ReactNode> = {
  telegram: <TelegramMark />,
};

/**
 * Знак канала. Для добавленных из админки его взять неоткуда, поэтому пишем
 * название — короткое слово узнаётся лучше, чем чужой логотип наугад.
 */
const markOf = (id: string, label: string): React.ReactNode =>
  MARKS[id] ?? <span className="text-[15px] font-black tracking-tight">{label.toUpperCase()}</span>;

/**
 * Адрес страницы. Через `useSyncExternalStore`, а не через эффект с `setState`:
 * на сервере адреса нет, а запись состояния в эффекте вызывает лишний каскад
 * рендеров (и запрещена правилом `react-hooks/set-state-in-effect`).
 */
const subscribe = () => () => {};
const usePageUrl = () =>
  useSyncExternalStore(
    subscribe,
    () => window.location.href,
    () => "",
  );

export default function MessengerLinks({ car, channels, hint = false, className = "" }: MessengerLinksProps) {
  const pageUrl = usePageUrl();
  const [copied, setCopied] = useState(false);

  const links = pageUrl ? messengerLinks(leadMessage(car, pageUrl), channels) : [];
  if (!links.length) return null;

  /**
   * Max и VK не умеют подставлять текст в поле ввода — кладём его в буфер,
   * чтобы человек вставил одним движением. Переход по ссылке не отменяем.
   */
  async function copyMessage() {
    try {
      await navigator.clipboard?.writeText(leadMessage(car, pageUrl));
      setCopied(true);
    } catch {
      // Буфер недоступен (нет https или запрет браузера) — не мешаем открыть чат.
    }
  }

  return (
    <div className={className}>
      {/* Колонок ровно столько, сколько настроенных мессенджеров: одна кнопка
          в сетке на три оставляла две трети ширины пустыми. */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
      >
        {links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Написать в ${link.label}`}
            onClick={() => {
              // Маячок вместо перехода через наш сервер: если бэкенд затормозит,
              // человек всё равно попадёт в чат. Несколько процентов потерянной
              // статистики дешевле потерянного клиента.
              track({
                type: "outbound",
                messenger: link.id,
                lotId: lotIdOf(car),
                // Своя машина ссылки на CarClick не имеет, поэтому её узнают
                // по строковому id — иначе в бота ушло бы «Автомобиль из каталога».
                carId: car.id,
                pageUrl,
              });
              if (!link.prefillsMessage) void copyMessage();
            }}
            style={{ color: MARK_COLORS[link.id] ?? DEFAULT_MARK }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-border bg-white text-sm font-bold transition-colors duration-200 hover:border-gray-text/40 active:scale-[0.98]"
          >
            {markOf(link.id, link.label)}
          </a>
        ))}
      </div>
      {hint ? (
        <p className="mt-2 text-xs text-gray-text">
          {copied
            ? "Текст сообщения скопирован — вставьте его в чат."
            : "Сообщение со ссылкой на этот автомобиль уже готово."}
        </p>
      ) : null}
    </div>
  );
}
