"use client";

import { ChevronRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { SearchTreeFacet } from "@/data/facets";
import CheckRow from "@/components/ui/CheckRow";

type FilterBrandTreeProps = {
  facet: SearchTreeFacet;
  brands: string[];
  models: string[];
  onToggleBrand: (code: string) => void;
  onToggleModel: (code: string) => void;
};

const BRANDS_VISIBLE = 10;

/**
 * 62 марки и больше тысячи моделей — простым перечнем чекбоксов это не показать.
 * Поэтому поиск по названию, марки по популярности, модели раскрываются
 * по выбору марки (и сразу, если марка уже отмечена).
 */
const FilterBrandTree = ({ facet, brands, models, onToggleBrand, onToggleModel }: FilterBrandTreeProps) => {
  const [query, setQuery] = useState("");
  const [openBrand, setOpenBrand] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const search = query.trim().toLowerCase();

  const matched = useMemo(() => {
    if (!search) return facet.values;
    return facet.values.filter((brand) => {
      if (brand.label.toLowerCase().includes(search)) return true;
      return brand.models?.some((model) => model.label.toLowerCase().includes(search));
    });
  }, [facet.values, search]);

  // При поиске показываем все совпадения, иначе — первые десять по популярности.
  const visible = search || showAll ? matched : matched.slice(0, BRANDS_VISIBLE);
  const hidden = matched.length - visible.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск марки или модели"
          aria-label="Поиск марки или модели"
          className="h-9 w-full rounded-lg border border-gray-border pl-8 pr-8 text-sm text-dark placeholder:text-gray-text/70"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Очистить поиск"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-text hover:text-dark"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="py-2 text-sm text-gray-text">Ничего не нашлось</p>
      ) : null}

      <div className="flex max-h-[22rem] flex-col gap-0.5 overflow-y-auto pr-1">
        {visible.map((brand) => {
          const isChecked = brands.includes(brand.value);
          const isOpen = openBrand === brand.value || isChecked || Boolean(search);
          const brandModels = brand.models ?? [];
          const shownModels = search
            ? brandModels.filter((model) => model.label.toLowerCase().includes(search))
            : brandModels;

          return (
            <div key={brand.value}>
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <CheckRow
                    label={brand.label}
                    count={brand.count}
                    checked={isChecked}
                    onChange={() => onToggleBrand(brand.value)}
                  />
                </div>
                {brandModels.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setOpenBrand(isOpen && !isChecked && !search ? null : brand.value)}
                    aria-label={`Модели ${brand.label}`}
                    aria-expanded={isOpen}
                    className="shrink-0 rounded p-0.5 text-gray-text hover:text-dark"
                  >
                    <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                ) : null}
              </div>

              {isOpen && shownModels.length > 0 ? (
                <div className="mb-1 ml-6 flex flex-col gap-0.5 border-l border-gray-border pl-3">
                  {shownModels.map((model) => (
                    <CheckRow
                      key={model.value}
                      compact
                      label={model.label}
                      count={model.count}
                      checked={models.includes(model.value)}
                      onChange={() => onToggleModel(model.value)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!search && (hidden > 0 || showAll) ? (
        <button
          type="button"
          onClick={() => setShowAll((open) => !open)}
          className="self-start text-xs font-semibold text-primary hover:underline"
        >
          {showAll ? "Свернуть" : `Показать ещё ${hidden} марок`}
        </button>
      ) : null}
    </div>
  );
};

export default FilterBrandTree;
