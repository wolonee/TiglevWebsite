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
  // Красный — фирменный акцент и здесь означает «требует действия».
  new: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25",
  // Янтарный: работа идёт, но не закончена. Спутать с «готово» нельзя.
  progress: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  done: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
  muted: "bg-gray-bg text-gray-text ring-1 ring-inset ring-gray-border",
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
