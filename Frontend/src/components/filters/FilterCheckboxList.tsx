"use client";

import { useState } from "react";
import type { FacetValue } from "@/data/facets";
import CheckRow from "@/components/ui/CheckRow";

type FilterCheckboxListProps = {
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
  /** Сколько показать сразу; остальное — под «Показать ещё». */
  visibleLimit?: number;
  /** Кружок реального цвета вместо подписи-образца (для цвета кузова). */
  swatches?: boolean;
};


const FilterCheckboxList = ({
  values,
  selected,
  onToggle,
  visibleLimit = 8,
  swatches = false,
}: FilterCheckboxListProps) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? values : values.slice(0, visibleLimit);
  const hidden = values.length - visible.length;

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((item) => (
        <CheckRow
          key={item.value}
          label={item.label}
          count={item.count}
          checked={selected.includes(item.value)}
          onChange={() => onToggle(item.value)}
          swatch={swatches ? item.value : undefined}
        />
      ))}

      {hidden > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-1 self-start text-xs font-semibold text-primary hover:underline"
        >
          {expanded ? "Свернуть" : `Показать ещё ${hidden}`}
        </button>
      ) : null}
    </div>
  );
};

export default FilterCheckboxList;
