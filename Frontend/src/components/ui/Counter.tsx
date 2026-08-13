"use client";

type CounterProps = {
  value: number;
  tone?: "accent" | "neutral";
};

/** Красный кружок с числом выбранных фильтров. Ноль не показываем вовсе. */
const Counter = ({ value, tone = "accent" }: CounterProps) => {
  if (!value) return null;
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
        tone === "accent" ? "bg-primary text-white" : "bg-gray-bg text-gray-text"
      }`}
    >
      {value}
    </span>
  );
};

export default Counter;
