"use client";

import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { facets } from "@/data/facets";
import { brandKeywords } from "@/data/brandAliases";
import type { CheckboxFacet, Facet, RangeFacet, SearchTreeFacet } from "@/data/facets";
import {
  countActive,
  emptyFilters,
  toggleValue,
  type CatalogFilters,
  type MultiKey,
} from "@/lib/catalogFilters";
import Button from "@/components/ui/Button";
import CheckRow from "@/components/ui/CheckRow";
import Counter from "@/components/ui/Counter";
import { Field, FieldLabel, TextField } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import Select from "@/components/ui/Select";
import FilterBrandTree from "./FilterBrandTree";
import FilterRange from "./FilterRange";

type FilterPanelProps = {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  resultCount: number;
};

const isRange = (facet: Facet): facet is RangeFacet => facet.type === "range";
const isTree = (facet: Facet): facet is SearchTreeFacet => facet.type === "search-tree";

const findCheckbox = (key: string): CheckboxFacet | undefined =>
  [...facets.basic, ...facets.advanced].find(
    (facet): facet is CheckboxFacet => facet.key === key && facet.type === "checkbox",
  );

const brandFacet = facets.basic.find(isTree);
const mileageFacet = facets.basic.find((facet): facet is RangeFacet => isRange(facet) && facet.key === "mileage");
const yearFacet = findCheckbox("year");

/** Годы в фасете идут по популярности — для полей «от/до» нужен порядок по возрастанию. */
const YEARS = [...(yearFacet?.values ?? [])].sort((a, b) => Number(a.value) - Number(b.value));

/** Что показываем в раскрытой части: всё, чего нет в основной форме. */
const EXTRA_KEYS = ["fuel", "drive", "color", "delivery"] as const;

const digitsOnly = (value: string) => value.replace(/[^\d]/g, "");
const toOptions = (facet?: CheckboxFacet) =>
  (facet?.values ?? []).map((item) => ({ value: item.value, label: item.label, count: item.count }));

/**
 * Форма поиска над каталогом.
 *
 * Сбоку панель забирала около 300 px, и на три карточки в ряд ширины не хватало.
 * Здесь поля разложены в сетку над каталогом: видны сразу и ширину не отнимают.
 *
 * «Все параметры» раскрывает эту же карточку вниз, а не открывает окно поверх
 * страницы. У окна прокрутка через раз уезжала на страницу под ним; у раскрытия
 * вниз этой проблемы нет вовсе, потому что скроллится обычная страница.
 */
const FilterPanel = ({ filters, onChange, resultCount }: FilterPanelProps) => {
  const [isExpanded, setExpanded] = useState(false);
  const [priceDraft, setPriceDraft] = useState({ from: "", to: "" });
  const [syncedPrice, setSyncedPrice] = useState(filters.price);
  const active = countActive(filters);

  // Поля цены следуют за состоянием: сбросили фильтры — очистились и они.
  if (filters.price !== syncedPrice) {
    setSyncedPrice(filters.price);
    setPriceDraft({
      from: filters.price?.from ? String(filters.price.from) : "",
      to: filters.price?.to != null ? String(filters.price.to) : "",
    });
  }

  const setMulti = (key: MultiKey, value: string) => {
    const next = { ...filters, [key]: toggleValue(filters[key], value) };
    if (key === "brand" && !next.brand.includes(value)) {
      const orphaned = brandFacet?.values.find((brand) => brand.value === value)?.models?.map((m) => m.value) ?? [];
      next.model = next.model.filter((code) => !orphaned.includes(code));
    }
    onChange(next);
  };

  /** Селект — одно значение: пустое очищает фильтр, выбранное заменяет прежнее. */
  const selectOne = (key: MultiKey, value: string) => {
    const next = { ...filters, [key]: value ? [value] : [] };
    if (key === "brand") next.model = []; // сменили марку — прежние модели не годятся
    onChange(next);
  };

  // Значения берём из аргументов обработчика, а не из состояния: blur прилетает
  // в одном батче с вводом, и состояние там ещё старое.
  const applyPrice = (from: string, to: string) => {
    const parsedFrom = from ? Number(from) : null;
    const parsedTo = to ? Number(to) : null;
    if (parsedFrom == null && parsedTo == null) return onChange({ ...filters, price: null });
    onChange({ ...filters, price: { from: parsedFrom ?? 0, to: parsedTo } });
  };

  /** «Год от/до» разворачивается в список лет: в данных год — значение, а не диапазон. */
  const applyYears = (fromYear: string, toYear: string) => {
    if (!fromYear && !toYear) return onChange({ ...filters, year: [] });
    const from = fromYear ? Number(fromYear) : -Infinity;
    const to = toYear ? Number(toYear) : Infinity;
    const [low, high] = from <= to ? [from, to] : [to, from];
    onChange({
      ...filters,
      year: YEARS.filter((item) => Number(item.value) >= low && Number(item.value) <= high).map((i) => i.value),
    });
  };

  const selectedYears = filters.year.map(Number).sort((a, b) => a - b);
  const yearFrom = selectedYears.length ? String(selectedYears[0]) : "";
  const yearTo = selectedYears.length ? String(selectedYears[selectedYears.length - 1]) : "";
  const models = brandFacet?.values.find((brand) => brand.value === filters.brand[0])?.models ?? [];

  const toggleOption = (id: number) =>
    onChange({
      ...filters,
      opt: filters.opt.includes(id) ? filters.opt.filter((item) => item !== id) : [...filters.opt, id],
    });

  return (
    <div className="mb-5 rounded-2xl border border-gray-border bg-white p-4 shadow-sm sm:mb-7">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Марка">
          <Select
            options={(brandFacet?.values ?? []).map((b) => ({
              value: b.value,
              label: b.label,
              count: b.count,
              keywords: brandKeywords(b.value),
            }))}
            value={filters.brand[0] ?? ""}
            onChange={(value) => selectOne("brand", value)}
            placeholder="Любая"
            ariaLabel="Марка"
          />
        </Field>

        <Field label="Модель">
          <Select
            options={models.map((m) => ({ value: m.value, label: m.label, count: m.count }))}
            value={filters.model[0] ?? ""}
            onChange={(value) => selectOne("model", value)}
            placeholder="Любая"
            ariaLabel="Модель"
            disabled={!filters.brand.length}
            disabledHint="Сначала марка"
          />
        </Field>

        <div className="flex min-w-0 flex-col">
          <FieldLabel>Цена, ₽</FieldLabel>
          <div className="flex gap-2">
            <TextField
              inputMode="numeric"
              placeholder="от"
              label="Цена от"
              value={priceDraft.from}
              onChange={(event) => setPriceDraft((d) => ({ ...d, from: digitsOnly(event.target.value) }))}
              onBlur={(event) => applyPrice(digitsOnly(event.target.value), priceDraft.to)}
              onKeyDown={(event) => { if (event.key === "Enter") applyPrice(priceDraft.from, priceDraft.to); }}
            />
            <TextField
              inputMode="numeric"
              placeholder="до"
              label="Цена до"
              value={priceDraft.to}
              onChange={(event) => setPriceDraft((d) => ({ ...d, to: digitsOnly(event.target.value) }))}
              onBlur={(event) => applyPrice(priceDraft.from, digitsOnly(event.target.value))}
              onKeyDown={(event) => { if (event.key === "Enter") applyPrice(priceDraft.from, priceDraft.to); }}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <FieldLabel>Год</FieldLabel>
          {/*
            `flex-1 min-w-0` на каждом списке: корень Select — обычный блок, и во
            flex-строке он сжимался до ширины своего содержимого («от» плюс
            стрелка). Справа от пары оставалась пустота, хотя соседняя ячейка
            «Цена» той же ширины заполнялась полностью — у полей ввода `w-full`.
          */}
          <div className="flex gap-2">
            <Select
              className="flex-1 min-w-0"
              options={YEARS.map((y) => ({ value: y.value, label: y.label, count: y.count }))}
              value={yearFrom}
              onChange={(value) => applyYears(value, yearTo)}
              placeholder="от"
              ariaLabel="Год от"
            />
            <Select
              className="flex-1 min-w-0"
              options={YEARS.map((y) => ({ value: y.value, label: y.label, count: y.count }))}
              value={yearTo}
              onChange={(value) => applyYears(yearFrom, value)}
              placeholder="до"
              ariaLabel="Год до"
            />
          </div>
        </div>

        <Field label="Страна">
          <Select
            options={toOptions(findCheckbox("country"))}
            value={filters.country[0] ?? ""}
            onChange={(value) => selectOne("country", value)}
            placeholder="Любая"
            ariaLabel="Страна"
          />
        </Field>

        <Field label="Тип кузова">
          <Select
            options={toOptions(findCheckbox("body"))}
            value={filters.body[0] ?? ""}
            onChange={(value) => selectOne("body", value)}
            ariaLabel="Тип кузова"
          />
        </Field>

        <Field label="Коробка">
          <Select
            options={toOptions(findCheckbox("transmission"))}
            value={filters.transmission[0] ?? ""}
            onChange={(value) => selectOne("transmission", value)}
            placeholder="Любая"
            ariaLabel="Коробка"
          />
        </Field>

        <div className="flex min-w-0 flex-col">
          <FieldLabel>Наличие</FieldLabel>
          <Segmented
            ariaLabel="Наличие"
            value={filters.avail.length === 1 ? filters.avail[0] : ""}
            onChange={(value) => onChange({ ...filters, avail: value ? [value] : [] })}
            options={[
              { value: "", label: "Все" },
              { value: "instock", label: "В наличии" },
              { value: "order", label: "Под заказ" },
            ]}
          />
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-5 border-t border-gray-border pt-5">
          <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <FieldLabel>Марка и модель</FieldLabel>
              {brandFacet ? (
                <FilterBrandTree
                  facet={brandFacet}
                  brands={filters.brand}
                  models={filters.model}
                  onToggleBrand={(code) => setMulti("brand", code)}
                  onToggleModel={(code) => setMulti("model", code)}
                />
              ) : null}
            </div>

            <div className="min-w-0">
              <FieldLabel>Пробег</FieldLabel>
              {mileageFacet ? (
                <FilterRange
                  facet={mileageFacet}
                  value={filters.mileage}
                  onChange={(range) => onChange({ ...filters, mileage: range })}
                />
              ) : null}
            </div>

            {EXTRA_KEYS.map((key) => {
              const facet = findCheckbox(key);
              if (!facet) return null;
              const selected = filters[key as MultiKey] ?? [];
              return (
                <div key={key} className="min-w-0">
                  <FieldLabel>{facet.label}</FieldLabel>
                  <div className="flex flex-col gap-1.5">
                    {facet.values.map((item) => (
                      <CheckRow
                        key={item.value}
                        label={item.label}
                        count={item.count}
                        checked={selected.includes(item.value)}
                        onChange={() => setMulti(key as MultiKey, item.value)}
                        swatch={key === "color" ? item.value : undefined}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {facets.optionGroups.map((group) => (
              <div key={group.title} className="min-w-0">
                <FieldLabel>{group.title}</FieldLabel>
                <div className="flex flex-col gap-1.5">
                  {group.options.slice(0, 8).map((option) => (
                    <CheckRow
                      key={option.id}
                      label={option.label}
                      count={option.count}
                      checked={filters.opt.includes(option.id)}
                      onChange={() => toggleOption(option.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-border pt-3.5">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={isExpanded}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {isExpanded ? "Свернуть параметры" : "Все параметры"}
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </button>

        <div className="flex items-center gap-3">
          {active > 0 ? (
            <>
              <Counter value={active} />
              <Button variant="ghost" size="sm" onClick={() => onChange({ ...emptyFilters, opt: [] })}>
                <X className="h-4 w-4" />
                Сбросить
              </Button>
            </>
          ) : null}
          <Button
            variant="primary"
            onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}
          >
            Показать {resultCount.toLocaleString("ru-RU")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
