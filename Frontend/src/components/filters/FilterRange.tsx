"use client";

import { useState } from "react";
import type { RangeFacet } from "@/data/facets";
import type { NumericRange } from "@/lib/catalogFilters";

type FilterRangeProps = {
  facet: RangeFacet;
  value: NumericRange | null;
  onChange: (range: NumericRange | null) => void;
};

const same = (a: NumericRange | null, b: NumericRange) => a != null && a.from === b.from && a.to === b.to;
const formatCount = (count: number) => count.toLocaleString("ru-RU");

/**
 * Готовые интервалы, а не ползунок.
 *
 * Цены идут от 160 тыс. до 151 млн, но 95% каталога лежит в 1.6–11.8 млн:
 * на линейной шкале весь каталог сжался бы в левую пятую часть, и попасть
 * мышью в нужный диапазон было бы невозможно. С пробегом то же самое.
 * Поля «от/до» остаются для тех, кому нужна своя граница.
 */
const FilterRange = ({ facet, value, onChange }: FilterRangeProps) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [syncedValue, setSyncedValue] = useState(value);

  // Ручные поля следуют за состоянием: выбрали интервал или сбросили фильтры —
  // поля обновились. Правим состояние прямо в рендере, а не в эффекте: эффект
  // здесь дал бы лишний проход рендера на каждое изменение фильтра.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setFrom(value?.from ? String(value.from) : "");
    setTo(value?.to != null ? String(value.to) : "");
  }

  const applyManual = () => {
    const parsedFrom = Number(from.replace(/\s/g, ""));
    const parsedTo = Number(to.replace(/\s/g, ""));
    const hasFrom = from.trim() !== "" && Number.isFinite(parsedFrom);
    const hasTo = to.trim() !== "" && Number.isFinite(parsedTo);
    if (!hasFrom && !hasTo) return onChange(null);
    onChange({ from: hasFrom ? parsedFrom : 0, to: hasTo ? parsedTo : null });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        {facet.buckets.map((bucket) => {
          const isActive = same(value, { from: bucket.from, to: bucket.to });
          return (
            <label
              key={bucket.label}
              className="flex cursor-pointer items-center gap-2.5 rounded-md py-0.5 text-sm hover:text-dark"
            >
              <input
                type="radio"
                name={`range-${facet.key}`}
                checked={isActive}
                onChange={() => onChange(isActive ? null : { from: bucket.from, to: bucket.to })}
                onClick={() => { if (isActive) onChange(null); }}
                className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
              />
              <span className={`min-w-0 flex-1 truncate ${isActive ? "font-semibold text-dark" : "text-gray-text"}`}>
                {bucket.label}
              </span>
              <span className="shrink-0 text-xs text-gray-text/70 tabular-nums">{formatCount(bucket.count)}</span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          onBlur={applyManual}
          onKeyDown={(event) => { if (event.key === "Enter") applyManual(); }}
          placeholder="от"
          aria-label={`${facet.label} от`}
          className="w-full min-w-0 rounded-lg border border-gray-border px-2.5 py-1.5 text-sm tabular-nums"
        />
        <span className="text-gray-text">–</span>
        <input
          type="text"
          inputMode="numeric"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          onBlur={applyManual}
          onKeyDown={(event) => { if (event.key === "Enter") applyManual(); }}
          placeholder="до"
          aria-label={`${facet.label} до`}
          className="w-full min-w-0 rounded-lg border border-gray-border px-2.5 py-1.5 text-sm tabular-nums"
        />
      </div>
    </div>
  );
};

export default FilterRange;
