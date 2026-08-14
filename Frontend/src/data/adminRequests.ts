import type { BadgeTone } from "@/components/ui/Badge";

export type RequestStatus = "new" | "in_progress" | "completed" | "archived";

export type CustomerRequest = {
  id: string;
  kind: "contact" | "sell";
  status: RequestStatus;
  payload: Record<string, unknown>;
  photoCount: number;
  photoUrls: string[];
  note?: string;
  createdAt: string;
  updatedAt?: string;
};

export const requestStatusLabels: Record<RequestStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  completed: "Завершена",
  archived: "Архив",
};

/**
 * Цвет состояния. Здесь, а не в компонентах: список заявок и карточка должны
 * красить статус одинаково, иначе «Новая» в списке и «Новая» внутри выглядят
 * как разные состояния.
 */
export const requestStatusTones: Record<RequestStatus, BadgeTone> = {
  new: "new",
  in_progress: "progress",
  completed: "done",
  archived: "muted",
};

/**
 * Пояснение к статусу — в админке работает не только автор этих слов.
 * Статус меняется только вручную, поэтому «Новая» означает «не взяли в работу»,
 * а не «не открывали»: открытие заявки её состояния не трогает.
 */
export const requestStatusHints: Record<RequestStatus, string> = {
  new: "Никто ещё не взялся",
  in_progress: "Взята в работу, ответ не закрыт",
  completed: "Клиенту ответили, вопрос закрыт",
  archived: "Убрана из работы",
};

export const requestFieldLabels: Record<string, string> = {
  firstName: "Имя",
  lastName: "Фамилия",
  name: "Имя",
  phone: "Телефон",
  email: "E-mail",
  model: "Марка и модель",
  year: "Год выпуска",
  bodyType: "Тип кузова",
  engine: "Двигатель",
  steeringWheel: "Руль",
  transmission: "КПП",
  mileage: "Пробег",
  message: "Сообщение",
  source: "Страница",
  carTitle: "Автомобиль",
  carPrice: "Цена",
  carUrl: "Ссылка на автомобиль",
};
