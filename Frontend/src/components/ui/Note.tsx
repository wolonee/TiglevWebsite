"use client";

import type { ReactNode } from "react";

/**
 * Строка-сообщение: результат сохранения, предупреждение, подсказка.
 *
 * Три тона и ничего больше. Раньше каждый экран красил такие сообщения сам —
 * успех был то зелёным, то серым, а предупреждение в админке оказывалось
 * набрано тем же красным, что и кнопка «Сохранить» рядом, и читалось как
 * вторая кнопка.
 */

type NoteTone = "info" | "warning" | "success";

const TONES: Record<NoteTone, string> = {
  info: "bg-gray-bg text-gray-text",
  // Предупреждение — на красной подложке, но текстом, а не кнопкой:
  // рядом всегда есть настоящая красная кнопка, и спутать их нельзя.
  warning: "bg-red-50 text-primary",
  success: "bg-green-50 text-green-700",
};

const Note = ({
  tone = "info",
  children,
  className = "",
}: {
  tone?: NoteTone;
  children: ReactNode;
  className?: string;
}) => (
  <p className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${TONES[tone]} ${className}`}>{children}</p>
);

export default Note;
