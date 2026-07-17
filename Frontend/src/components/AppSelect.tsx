"use client";

import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";

type AppSelectProps = {
  ariaLabel: string;
  options: readonly string[];
  placeholder: string;
  value?: string;
  defaultValue?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  clearLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
};

const CLEAR_VALUE = "__all__";
const itemClassName = "relative flex cursor-pointer select-none items-center rounded-lg border border-transparent py-2.5 pl-3 pr-9 text-sm text-dark outline-none shadow-none data-[highlighted]:bg-gray-bg data-[highlighted]:text-primary data-[state=checked]:text-primary";

export default function AppSelect({
  ariaLabel,
  options,
  placeholder,
  value,
  defaultValue,
  name,
  onValueChange,
  className = "",
  clearLabel,
  searchable = false,
  searchPlaceholder = "Поиск…",
}: AppSelectProps) {
  const [search, setSearch] = useState("");
  const selectedValue = clearLabel && value === "" ? CLEAR_VALUE : value;
  const selectedDefaultValue = clearLabel && defaultValue === "" ? CLEAR_VALUE : defaultValue;
  const filteredOptions = searchable
    ? options.filter((option) => option.toLocaleLowerCase("ru-RU").includes(search.trim().toLocaleLowerCase("ru-RU")))
    : options;

  return (
    <SelectPrimitive.Root
      name={name}
      value={selectedValue}
      defaultValue={selectedDefaultValue}
      onOpenChange={(open) => { if (!open) setSearch(""); }}
      onValueChange={(nextValue) => onValueChange?.(nextValue === CLEAR_VALUE ? "" : nextValue)}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={`flex w-full items-center justify-between rounded-xl border border-gray-border bg-white py-3 pl-4 pr-4 text-sm text-dark outline-none shadow-none transition-colors data-[placeholder]:text-gray-text focus:border-primary focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:shadow-none ${className}`}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="ml-3 mr-1 h-4 w-4 shrink-0 text-gray-text" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-[100] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-gray-border bg-white p-1.5 shadow-xl"
        >
          {searchable && <div className="relative mb-1.5 border-b border-gray-border pb-1.5"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-[calc(50%+3px)] text-gray-text" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.stopPropagation()} placeholder={searchPlaceholder} className="w-full rounded-lg bg-gray-bg py-2.5 pl-9 pr-3 text-sm text-dark outline-none placeholder:text-gray-text focus:ring-0" /></div>}
          <SelectPrimitive.Viewport className="max-h-64">
            {clearLabel && (
              <SelectPrimitive.Item
                value={CLEAR_VALUE}
                className={itemClassName}
              >
                <SelectPrimitive.ItemText>{clearLabel}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-3">
                  <Check className="h-4 w-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            )}
            {filteredOptions.map((option) => (
              <SelectPrimitive.Item
                key={option}
                value={option}
                className={itemClassName}
              >
                <SelectPrimitive.ItemText>{option}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-3">
                  <Check className="h-4 w-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
            {!filteredOptions.length && <p className="px-3 py-4 text-center text-sm text-gray-text">Ничего не найдено</p>}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
