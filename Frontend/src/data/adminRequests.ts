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
};
