"use client";

import { Check, ChevronDown } from "lucide-react";
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
};

const CLEAR_VALUE = "__all__";

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
}: AppSelectProps) {
  const selectedValue = clearLabel && value === "" ? CLEAR_VALUE : value;
  const selectedDefaultValue = clearLabel && defaultValue === "" ? CLEAR_VALUE : defaultValue;

  return (
    <SelectPrimitive.Root
      name={name}
      value={selectedValue}
      defaultValue={selectedDefaultValue}
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
          className="z-[100] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-gray-border bg-white p-1.5 shadow-xl"
        >
          <SelectPrimitive.Viewport>
            {clearLabel && (
              <SelectPrimitive.Item
                value={CLEAR_VALUE}
                className="relative flex cursor-pointer select-none items-center rounded-lg py-2.5 pl-3 pr-9 text-sm text-dark outline-none data-[highlighted]:bg-gray-bg data-[highlighted]:text-primary"
              >
                <SelectPrimitive.ItemText>{clearLabel}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-3">
                  <Check className="h-4 w-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            )}
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option}
                value={option}
                className="relative flex cursor-pointer select-none items-center rounded-lg py-2.5 pl-3 pr-9 text-sm text-dark outline-none data-[highlighted]:bg-gray-bg data-[highlighted]:text-primary"
              >
                <SelectPrimitive.ItemText>{option}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-3">
                  <Check className="h-4 w-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
