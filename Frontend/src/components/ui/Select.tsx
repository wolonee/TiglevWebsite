"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CONTROL_BASE } from "./Field";

export type SelectOption = {
  value: string;
  label: string;
  /** Сколько машин под этим значением — показываем справа, бледнее подписи. */
  count?: number;
  /** Синонимы для поиска: марки в базе латиницей, а ищут их по-русски. */
  keywords?: string[];
};

type SelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Подпись для скринридера, когда видимой подписи рядом нет. */
  ariaLabel?: string;
  disabled?: boolean;
  disabledHint?: string;
  /**
   * Начиная со скольких вариантов поле становится поисковым.
   * Для «Привода» с тремя значениями набирать текст незачем — там обычная кнопка.
   */
  searchThreshold?: number;
  className?: string;
};

/** Пауза перед фильтрацией. Короткая: длиннее — и список ощутимо отстаёт от набора. */
const DEBOUNCE_MS = 150;

const formatCount = (count: number) => count.toLocaleString("ru-RU");

/**
 * Свой список вместо системного `<select>`.
 *
 * Системный нельзя оформить: он рисуется операционной системой, игнорирует шрифт
 * и скругления, и в нём некуда положить счётчики.
 *
 * У длинных списков (марок — 62, моделей — до сотни) само поле является строкой
 * поиска: нажал и сразу набираешь, не целясь во вторую строку внутри списка.
 * Фильтрация идёт через паузу — набор не дёргает список на каждой букве.
 *
 * Клавиатура работает как у системного: стрелки водят по списку, Enter выбирает,
 * Escape закрывает.
 */
const Select = ({
  options,
  value,
  onChange,
  placeholder = "Любой",
  ariaLabel,
  disabled = false,
  disabledHint,
  searchThreshold = 8,
  className = "",
}: SelectProps) => {
  const listId = useId();
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const holder = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchable = options.length >= searchThreshold;
  const selected = options.find((option) => option.value === value);

  const close = () => {
    setOpen(false);
    setQuery("");
    setAppliedQuery("");
  };

  const open = () => {
    setOpen(true);
    setActiveIndex(0);
  };

  const pick = (next: string) => {
    onChange(next);
    close();
    inputRef.current?.blur();
  };

  // Пауза между набором и фильтрацией. Значение в поле меняется сразу,
  // а список пересобирается, когда человек перестал печатать.
  useEffect(() => {
    const timer = setTimeout(() => setAppliedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const visible = useMemo(() => {
    const needle = appliedQuery.trim().toLowerCase();
    if (!needle) return options;
    // Совпадения с начала слова идут первыми: «BM» должно дать BMW, а не Nissan BM.
    // Синонимы ищутся тоже, но уступают совпадению по самой подписи.
    const scored = options
      .map((option) => {
        const byLabel = option.label.toLowerCase().indexOf(needle);
        if (byLabel >= 0) return { option, at: byLabel };
        const bySynonym = option.keywords?.some((word) => word.includes(needle));
        return { option, at: bySynonym ? 500 : -1 };
      })
      .filter((item) => item.at >= 0)
      .sort((a, b) => a.at - b.at);
    return scored.map((item) => item.option);
  }, [options, appliedQuery]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!holder.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  // Ведём подсвеченный вариант в зоне видимости при навигации стрелками.
  useEffect(() => {
    if (!isOpen) return;
    const node = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        open();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, visible.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = visible[activeIndex];
      if (option) pick(option.value);
    }
  };

  // Пока список открыт, рамка красная; выбрали значение — вернулась к обычной.
  const triggerClass = `${CONTROL_BASE} flex cursor-pointer items-center justify-between gap-2 pr-2.5 text-left ${
    isOpen ? "border-primary" : ""
  }`;

  const label = disabled && disabledHint ? disabledHint : (selected?.label ?? placeholder);

  return (
    <div ref={holder} className={`relative ${className}`}>
      {searchable ? (
        // Поле само является строкой поиска: нажал и набирай.
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-label={ariaLabel}
            disabled={disabled}
            value={isOpen ? query : (selected?.label ?? "")}
            placeholder={isOpen ? (selected?.label ?? placeholder) : label}
            onFocus={open}
            onClick={open}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={onKeyDown}
            className={`${CONTROL_BASE} cursor-text pr-8 ${isOpen ? "border-primary" : ""} ${
              !selected && !isOpen ? "placeholder:text-gray-text" : ""
            }`}
          />
          <ChevronDown
            className={`pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-text transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      ) : (
        <button
          type="button"
          data-control
          role="combobox"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-label={ariaLabel}
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={onKeyDown}
          className={triggerClass}
        >
          <span className={`truncate ${selected ? "text-dark" : "text-gray-text"}`}>{label}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-text transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {/*
        Ширина списка не привязана к полю: в узкой колонке от подписей
        оставались первые буквы. Минимум 15rem, дальше — по ширине поля.
      */}
      {isOpen ? (
        <div className="absolute left-0 top-full z-40 mt-1.5 w-full min-w-[15rem] max-w-[min(22rem,90vw)] overflow-hidden rounded-xl border border-gray-border bg-white shadow-[0_16px_36px_rgb(15_23_42/0.14)]">
          <div ref={listRef} id={listId} role="listbox" className="max-h-64 overflow-y-auto p-1">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => pick("")}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-gray-bg ${
                !value ? "font-semibold text-dark" : "text-gray-text"
              }`}
            >
              <span className="flex-1 truncate">{placeholder}</span>
              {!value ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
            </button>

            {visible.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(option.value)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${
                    index === activeIndex ? "bg-gray-bg" : ""
                  } ${isSelected ? "font-semibold text-dark" : "text-dark/80"}`}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.count != null ? (
                    <span className="shrink-0 text-xs text-gray-text/70 tabular-nums">
                      {formatCount(option.count)}
                    </span>
                  ) : null}
                  {isSelected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                </button>
              );
            })}

            {visible.length === 0 ? (
              <p className="px-2.5 py-3 text-sm text-gray-text">Ничего не нашлось</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Select;
