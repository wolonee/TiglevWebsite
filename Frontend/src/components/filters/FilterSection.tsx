"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

type FilterSectionProps = {
  title: string;
  /** Сколько значений выбрано — показываем цифрой, чтобы было видно в свёрнутом виде. */
  selected?: number;
  defaultOpen?: boolean;
  children: ReactNode;
};

const FilterSection = ({ title, selected = 0, defaultOpen = true, children }: FilterSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-gray-border py-3 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-dark">
          {title}
          {selected > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white tabular-nums">
              {selected}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-text transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen ? <div className="mt-3">{children}</div> : null}
    </section>
  );
};

export default FilterSection;
