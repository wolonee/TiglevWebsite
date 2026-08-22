import type { Car } from "./cars";
import { formatPrice } from "./cars";

/**
 * Связь с клиентом через мессенджеры.
 *
 * Почта — только сигнал администратору «пришла заявка»; переписки там нет.
 * Живой разговор идёт в Telegram, VK или другом канале, поэтому на странице
 * лота человеку дают прямую ссылку в чат, а не адрес почты.
 *
 * Список каналов приходит из базы и правится в админке (`/admin/messengers`).
 * Переменные окружения остались запасным вариантом: если бэкенд не ответил,
 * сайт всё равно показывает связь, а не пустое место под кнопкой заявки.
 */

export type MessengerChannel = {
  /** Слаг: попадает в разметку и в статистику переходов. */
  id: string;
  label: string;
  handle: string;
  /** Шаблон ссылки: `{handle}` и `{message}` подставляются. */
  urlTemplate: string;
  /**
   * Ссылка сама подставит заготовленный текст в поле ввода.
   * Так умеет только Telegram (`?text=`). У остальных такого параметра нет,
   * поэтому текст туда кладём в буфер обмена — иначе человек напишет
   * «здравствуйте» без ссылки на машину, и менеджер не поймёт, о чём речь.
   */
  prefillsMessage: boolean;
  enabled: boolean;
};

export type MessengerLink = {
  id: string;
  label: string;
  href: string;
  prefillsMessage: boolean;
};

const clean = (handle?: string) => handle?.trim().replace(/^@/, "") ?? "";

/**
 * Запасной список, когда бэкенд не ответил.
 *
 * Читаем окружение при каждом вызове, а не один раз на уровне модуля: так
 * значение можно подменить в тестах. Next всё равно подставит его в бандл —
 * ему важно только обращение литералом `process.env.NEXT_PUBLIC_…`.
 *
 * У Telegram и VK ники заданы по умолчанию: эти аккаунты уже опубликованы,
 * а без значения кнопка молча пропадала на любой сборке, где переменную
 * забыли задать, и заметить это можно было только глазами.
 */
export function defaultChannels(): MessengerChannel[] {
  return [
    {
      id: "telegram",
      label: "Telegram",
      handle: process.env.NEXT_PUBLIC_TELEGRAM_USERNAME || "NARCI33IST",
      urlTemplate: "https://t.me/{handle}?text={message}",
      prefillsMessage: true,
      enabled: true,
    },
    {
      // У MAX нет публичных ников: человека находят по токену из личной ссылки
      // вида max.ru/u/<токен>. Токен владельца уже опубликован — держим его
      // дефолтом, как у Telegram и VK, чтобы кнопка не пропала без переменной.
      id: "max",
      label: "MAX",
      handle:
        process.env.NEXT_PUBLIC_MAX_USERNAME ||
        "f9LHodD0cOLBHGiTyQ8i5DDZojLAxHUttCErWXfF2FuF4tD32nOYa8GxZ-w",
      urlTemplate: "https://max.ru/u/{handle}",
      prefillsMessage: false,
      enabled: true,
    },
    {
      id: "vk",
      label: "VK",
      handle: process.env.NEXT_PUBLIC_VK_USERNAME || "prosto_tigl",
      urlTemplate: "https://vk.me/{handle}",
      prefillsMessage: false,
      enabled: true,
    },
  ];
}

/**
 * Подстановка в шаблон. Ник кодируем: он приходит из админки, и пробел или
 * кириллица в нём не должны ломать ссылку.
 */
export function buildHref(channel: Pick<MessengerChannel, "urlTemplate" | "handle">, message: string): string {
  return channel.urlTemplate
    .replace("{handle}", encodeURIComponent(clean(channel.handle)))
    .replace("{message}", encodeURIComponent(message));
}

/** Текст, который клиент отправит первым сообщением. */
export function leadMessage(car: Pick<Car, "brand" | "model" | "year" | "price">, pageUrl: string): string {
  const title = [car.brand, car.model, car.year ? `${car.year} г.` : ""].filter(Boolean).join(" ");
  return `Здравствуйте! Интересует ${title} — ${formatPrice(car.price)}.\n${pageUrl}\nПодскажите, пожалуйста, по этому автомобилю.`;
}

/**
 * Мессенджеры со ссылками на чат.
 *
 * Без списка каналов берём значения из окружения: это путь на случай, когда
 * бэкенд недоступен, — потерять кнопки связи хуже, чем показать вчерашние.
 */
export function messengerLinks(message: string, channels?: MessengerChannel[]): MessengerLink[] {
  return (channels ?? defaultChannels())
    .filter((channel) => channel.enabled && clean(channel.handle).length > 0)
    .map((channel) => ({
      id: channel.id,
      label: channel.label,
      href: buildHref(channel, message),
      prefillsMessage: channel.prefillsMessage,
    }));
}
