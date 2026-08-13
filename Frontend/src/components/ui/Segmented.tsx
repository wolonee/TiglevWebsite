"use client";

export type SegmentOption = {
  value: string;
  label: string;
};

type SegmentedProps = {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
};

/**
 * Переключатель на два-три коротких варианта.
 *
 * Подписи здесь должны быть короткими и без цифр. Счётчик в сегменте («В наличии (9)»)
 * ломает вёрстку: сегменты делят ширину поровну, число не влезает и переносится
 * на вторую строку. Числа — в списках, не в сегментах.
 */
const Segmented = ({ options, value, onChange, ariaLabel }: SegmentedProps) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    className="flex h-10 overflow-hidden rounded-lg border border-gray-border bg-white"
  >
    {options.map((option) => {
      const isActive = value === option.value;
      return (
        <button
          key={option.value || "all"}
          type="button"
          role="radio"
          aria-checked={isActive}
          onClick={() => onChange(option.value)}
          className={`flex-1 whitespace-nowrap border-r border-gray-border px-2 text-[13px] font-semibold transition-colors last:border-r-0 ${
            isActive ? "bg-primary text-white" : "bg-white text-gray-text hover:text-dark"
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

export default Segmented;
