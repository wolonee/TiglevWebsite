import type { Car } from "./cars";
import { formatPrice } from "./cars";

/**
 * Связь с клиентом через мессенджеры.
 *
 * Почта — только сигнал администратору «пришла заявка»; переписки там нет.
 * Живой разговор идёт в Telegram, Max или VK, поэтому на странице лота
 * человеку дают прямую ссылку в чат, а не адрес почты.
 *
 * Ники берутся из переменных окружения: у сайта, backend-бота и личного
 * аккаунта менеджера они разные и меняются без правки кода. Ненастроенный
 * мессенджер просто не показывается — лучше две кнопки, чем третья в никуда.
 */

export type MessengerId = "telegram" | "max" | "vk";

export type MessengerLink = {
  id: MessengerId;
  label: string;
  href: string;
  /**
   * Ссылка сама подставит заготовленный текст в поле ввода.
   * Так умеет только Telegram (`?text=`). У Max и VK такого параметра нет,
   * поэтому текст туда кладём в буфер обмена — иначе человек напишет
   * «здравствуйте» без ссылки на машину, и менеджер не поймёт, о чём речь.
   */
  prefillsMessage: boolean;
  /** Ник не настроен: кнопка стоит для вида и ведёт на сайт мессенджера. */
  isMock?: boolean;
};

/**
 * Читаем окружение при каждом вызове, а не один раз на уровне модуля: так
 * значение можно подменить в тестах. Next всё равно подставит его в бандл —
 * ему важно только обращение литералом `process.env.NEXT_PUBLIC_…`.
 */
const handles = (): Record<MessengerId, string | undefined> => ({
  telegram: process.env.NEXT_PUBLIC_TELEGRAM_USERNAME,
  max: process.env.NEXT_PUBLIC_MAX_USERNAME,
  // Этот аккаунт уже опубликован в подвале сайта и в контактах, так что кнопка
  // работает без настройки. Переменной окружения можно перекрыть.
  vk: process.env.NEXT_PUBLIC_VK_USERNAME || "prosto_tigl",
});

const LABELS: Record<MessengerId, string> = {
  telegram: "Telegram",
  max: "Max",
  vk: "VK",
};

const clean = (handle?: string) => handle?.trim().replace(/^@/, "") ?? "";

/**
 * Заглушек здесь нет намеренно.
 *
 * У MAX не оказалось публичных ников — искать человека можно только по номеру
 * телефона, поэтому кнопки для него нет. Раньше она стояла ради симметрии ряда
 * и вела на главную `max.ru`: покупатель нажимал и попадал в никуда, что хуже
 * отсутствующей кнопки. Появится способ дать прямую ссылку на чат —
 * достаточно задать `NEXT_PUBLIC_MAX_USERNAME`.
 */
const MOCKED: Partial<Record<MessengerId, string>> = {};

const buildHref = (id: MessengerId, handle: string, message: string): string => {
  switch (id) {
    case "telegram":
      return `https://t.me/${handle}?text=${encodeURIComponent(message)}`;
    case "max":
      return `https://max.ru/${handle}`;
    case "vk":
      return `https://vk.me/${handle}`;
  }
};

/** Текст, который клиент отправит первым сообщением. */
export function leadMessage(car: Pick<Car, "brand" | "model" | "year" | "price">, pageUrl: string): string {
  const title = [car.brand, car.model, car.year ? `${car.year} г.` : ""].filter(Boolean).join(" ");
  return `Здравствуйте! Интересует ${title} — ${formatPrice(car.price)}.\n${pageUrl}\nПодскажите, пожалуйста, по этому автомобилю.`;
}

/** Настроен ли хоть один мессенджер. Нужно до того, как известен адрес страницы. */
export function hasMessengers(): boolean {
  return messengerLinks("").length > 0;
}

/** Мессенджеры со ссылками на чат. Ненастроенные показываем только если замоканы. */
export function messengerLinks(message: string): MessengerLink[] {
  const configured = handles();
  return (Object.keys(configured) as MessengerId[])
    .map((id) => ({ id, handle: clean(configured[id]) }))
    .filter(({ id, handle }) => handle.length > 0 || MOCKED[id])
    .map(({ id, handle }) => ({
      id,
      label: LABELS[id],
      href: handle ? buildHref(id, handle, message) : MOCKED[id]!,
      prefillsMessage: Boolean(handle) && id === "telegram",
      ...(handle ? {} : { isMock: true }),
    }));
}
