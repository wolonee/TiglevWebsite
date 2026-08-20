"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Растянуть на всю ширину — на телефоне так делают почти все кнопки. */
  block?: boolean;
  children: ReactNode;
};

/**
 * Красный (`primary`) — целевое действие: «Показать», «Отправить».
 * Тёмный (`secondary`) — действие, но не главное на экране.
 * `outline` и `ghost` — вспомогательные, `link` — текстом.
 *
 * Кольцо фокуса не задаётся здесь: оно одно на весь сайт и живёт в globals.css.
 * Любая попытка добавить сюда свой focus:ring снова даст двойную обводку.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark active:scale-[0.98]",
  secondary: "bg-dark text-white hover:bg-dark-light active:scale-[0.98]",
  outline: "border border-gray-border bg-white text-dark hover:border-gray-text/40",
  ghost: "text-gray-text hover:bg-gray-bg hover:text-dark",
  link: "text-primary hover:underline px-0",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-[15px] gap-2",
};

const Button = ({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={[
      "inline-flex shrink-0 items-center justify-center rounded-lg font-semibold transition-colors duration-200",
      "disabled:pointer-events-none disabled:opacity-50",
      VARIANTS[variant],
      variant === "link" ? "h-auto" : SIZES[size],
      block ? "w-full" : "",
      className,
    ].filter(Boolean).join(" ")}
    {...rest}
  >
    {children}
  </button>
);

export default Button;

/**
 * Кнопка-квадрат с одним знаком: удалить строку, переставить выше.
 *
 * Отдельным компонентом, потому что у такой кнопки два обязательных свойства,
 * о которых легко забыть: подпись для читалки экрана (знака мало) и
 * фиксированная ширина — иначе ряд из трёх иконок пляшет по ширине.
 */
export const IconButton = ({
  label,
  variant = "ghost",
  className = "",
  children,
  ...rest
}: Omit<ButtonProps, "block" | "size"> & { label: string }) => (
  <Button
    variant={variant}
    size="sm"
    aria-label={label}
    title={label}
    className={`w-8 px-0 ${className}`}
    {...rest}
  >
    {children}
  </Button>
);
