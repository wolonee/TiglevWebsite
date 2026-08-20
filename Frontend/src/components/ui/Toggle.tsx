"use client";

import type { ReactNode } from "react";

/**
 * Переключатель «включено / выключено».
 *
 * Появился для админки: там решают судьбу целого блока сайта — показывать канал
 * связи, показывать строку в подвале. Галочка для этого читается плохо, потому
 * что означает «выбрал из списка», а здесь смысл другой: рубильник, который
 * прямо сейчас меняет то, что видит покупатель.
 *
 * Цвет включённого состояния — зелёный: он читается как «работает» с одного
 * взгляда, тогда как тёмная заливка выглядела просто выключателем в другом
 * положении. Красным он быть не может — красная кнопка на экране одна, и это
 * целевое действие («Сохранить»), а не десяток рубильников рядом.
 */

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  /** Пояснение под подписью: чем обернётся выключение. */
  hint?: string;
  disabled?: boolean;
};

const Toggle = ({ checked, onChange, label, hint, disabled = false }: ToggleProps) => (
  <label
    className={`flex items-start gap-3 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
  >
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? "bg-green-600" : "bg-gray-border"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left] duration-200 ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-dark">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs leading-relaxed text-gray-text">{hint}</span> : null}
    </span>
  </label>
);

export default Toggle;
