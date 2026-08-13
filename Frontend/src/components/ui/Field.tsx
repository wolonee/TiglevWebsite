"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Подпись поля. Вынесена отдельно, чтобы «Цена, ₽» с парой полей и обычный
 * селект выглядели одинаково: один размер, один цвет, один отступ.
 */
export const FieldLabel = ({ children }: { children: ReactNode }) => (
  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-gray-text">
    {children}
  </span>
);

export const CONTROL_HEIGHT = "h-10";

/**
 * Базовый вид любого поля ввода: рамка, скругление, высота.
 * Здесь намеренно нет ничего про фокус — кольцо одно на весь сайт (globals.css).
 */
export const CONTROL_BASE =
  "h-10 w-full min-w-0 rounded-lg border border-gray-border bg-white px-3 text-sm text-dark " +
  "transition-colors placeholder:text-gray-text/70 " +
  "disabled:cursor-not-allowed disabled:bg-gray-bg disabled:text-gray-text";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const TextField = ({ label, className = "", ...rest }: TextFieldProps) => (
  <input className={`${CONTROL_BASE} ${className}`} aria-label={label} {...rest} />
);

/** Обёртка «подпись + контрол» для сеток фильтров и форм. */
export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex min-w-0 flex-col">
    <FieldLabel>{label}</FieldLabel>
    {children}
  </div>
);
