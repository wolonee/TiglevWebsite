"use client";

type CheckRowProps = {
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
  /** Кружок реального цвета вместо подписи — для цвета кузова. */
  swatch?: string;
  /** Вложенная строка (модель под маркой) — чуть мельче. */
  compact?: boolean;
};

const formatCount = (count: number) => count.toLocaleString("ru-RU");

/**
 * Строка списка с галочкой и числом справа.
 *
 * Число обязательно: пользователь сразу видит, что вариант даст 28 машин,
 * и не тратит клик. Пустая выдача — главная причина ухода из каталога.
 */
const CheckRow = ({ label, checked, onChange, count, swatch, compact = false }: CheckRowProps) => (
  <label
    className={`flex cursor-pointer items-center gap-2.5 rounded-md py-0.5 ${
      compact ? "text-[13px]" : "text-sm"
    }`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} shrink-0 cursor-pointer accent-primary`}
    />
    {swatch ? (
      <span
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-inset ring-dark/20"
        style={{
          background: swatch.startsWith("#")
            ? swatch
            : "linear-gradient(135deg,#c1c1c1 0%,#6b7280 50%,#0f172a 100%)",
        }}
      />
    ) : null}
    <span className={`min-w-0 flex-1 truncate ${checked ? "font-semibold text-dark" : "text-gray-text"}`}>
      {label}
    </span>
    {count != null ? (
      <span className="shrink-0 text-xs text-gray-text/70 tabular-nums">{formatCount(count)}</span>
    ) : null}
  </label>
);

export default CheckRow;
