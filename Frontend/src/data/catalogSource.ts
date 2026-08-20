/**
 * Каталог собирается из двух источников с разными словарями.
 *
 *   own      — девять машин в Тольятти, лежат в таблице `cars`.
 *              Пишут по-русски и точно: «Полный», «Передний», «Бензин».
 *   carclick — 83k лотов под заказ из-за рубежа.
 *              Словарь их API: «4WD», «2WD», «бензин» — строчными.
 *
 * Фильтры строятся из `facets.json`, то есть по словарю CarClick. Поэтому
 * значения приводятся к нему (`canonical*`), а показываются человеку в
 * читаемом виде (`display*`). Это две разные задачи, и путать их нельзя:
 * если нормализовать «Передний» в «2WD» и так же показать, мы потеряем
 * точную информацию, которая у своих машин есть.
 */

export type CarSource = "own" | "carclick";

export const OWN_SOURCE: CarSource = "own";
export const CARCLICK_SOURCE: CarSource = "carclick";

/** Привод: у CarClick только 2WD/4WD, точнее данных нет. */
const DRIVE_TO_CANONICAL: Record<string, string> = {
  полный: "4WD",
  "4wd": "4WD",
  awd: "4WD",
  передний: "2WD",
  задний: "2WD",
  "2wd": "2WD",
  fwd: "2WD",
  rwd: "2WD",
};

export function canonicalDrive(value?: string): string | undefined {
  if (!value) return undefined;
  return DRIVE_TO_CANONICAL[value.trim().toLowerCase()] ?? "другое";
}

/** Топливо и коробка различаются только регистром — приводим к нижнему. */
export function canonicalWord(value?: string): string | undefined {
  return value ? value.trim().toLowerCase() : undefined;
}

/** «бензин» → «Бензин». Для показа в карточке. */
export function displayWord(value?: string): string | undefined {
  if (!value) return undefined;
  const text = value.trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Привод для показа. У своих машин известно «Передний»/«Задний» — так и пишем,
 * это точнее, чем обобщённое «2WD». У импортных показываем как есть.
 */
export function displayDrive(value?: string): string | undefined {
  if (!value) return undefined;
  const text = value.trim();
  if (text.toLowerCase() === "другое") return undefined;
  return /^[а-яё]/i.test(text) ? displayWord(text) : text.toUpperCase();
}

export type SourceBadge = {
  /** Короткая подпись на фото. */
  label: string;
  /** own — зелёная (сильное преимущество), carclick — нейтральная тёмная. */
  tone: "available" | "neutral";
};

/**
 * Метка источника на карточке.
 *
 * Сознательно НЕ пишем покупателю слово «CarClick»: для него важно не имя
 * поставщика, а что он получает — машину сегодня в Тольятти или заказ
 * из Кореи через 45 дней. Имя источника остаётся в данных (`car.source`)
 * для фильтров, аналитики и админки.
 */
export function sourceBadge(source: CarSource | undefined, country?: string): SourceBadge {
  if (source === CARCLICK_SOURCE) {
    return { label: country?.trim() || "Под заказ", tone: "neutral" };
  }
  return { label: "В наличии в Тольятти", tone: "available" };
}
