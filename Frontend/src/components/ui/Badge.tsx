"use client";

import type { ReactNode } from "react";

/**
 * Метка состояния: статус заявки, признак источника.
 *
 * Появилась из-за заявок. Статус там был набран тем же серым, что и дата
 * рядом, — «Новая» и «Завершена» отличались только словом, и в списке из
 * двадцати карточек новая заявка ничем не выделялась. Теперь состояние видно
 * цветом, до чтения.
 *
 * Ничего мигающего и движущегося: админку держат открытой часами, и
 * пульсирующая точка в углу экрана раздражает ровно до того момента, когда её
 * перестают замечать вовсе — вместе с новыми заявками.
 */

export type BadgeTone = "new" | "progress" | "done" | "muted";

const TONES: Record<BadgeTone, string> = {
  // Синяя, а не красная: красный на сайте занят целевым действием, и метка
  // «Новая» рядом с красной кнопкой читалась как вторая кнопка или как ошибка.
  // Синий в интерфейсе означает «непрочитанное», а не «случилась беда».
  new: "bg-blue-600 text-white",
  // Работа идёт, но не закончена. Спутать с «готово» нельзя.
  progress: "bg-amber-100 text-amber-900",
  done: "bg-green-100 text-green-900",
  // Отработанное отступает: без заливки, только тонкая рамка.
  muted: "bg-white text-gray-text ring-1 ring-inset ring-gray-border",
};

const Badge = ({
  tone = "muted",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold ${TONES[tone]} ${className}`}
  >
    {children}
  </span>
);

export default Badge;
