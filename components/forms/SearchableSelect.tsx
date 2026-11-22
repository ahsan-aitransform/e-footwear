"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

export type SearchableSelectOption<TValue extends string | number> = {
  value: TValue;
  label: string;
  description?: string;
};

// A dropdown you can type into (Part 28: dropdowns support search). Follows the ARIA combobox pattern:
// the input has role="combobox", the list role="listbox", Arrow keys move, Enter picks, Escape closes.
// Put it inside a FormField to get a label and an error message:
//   <FormField label="Brand" name="brand">{(p) => <SearchableSelect {...p} options={brands} value={id} onValueChange={setId} />}</FormField>
export function SearchableSelect<TValue extends string | number>({
  id,
  name,
  options,
  value,
  onValueChange,
  placeholder,
  isClearable = false,
  isDisabled = false,
  ...ariaProps
}: {
  id?: string;
  name?: string;
  options: readonly SearchableSelectOption<TValue>[];
  value: TValue | null;
  onValueChange: (value: TValue | null) => void;
  placeholder?: string;
  isClearable?: boolean;
  isDisabled?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
}) {
  const { translateMessage } = useTranslation();
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedOption = options.find((option) => option.value === value) ?? null;

  const visibleOptions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (needle === "") return options;
    return options.filter(
      (option) =>
        option.label.toLocaleLowerCase().includes(needle) || option.description?.toLocaleLowerCase().includes(needle),
    );
  }, [options, query]);

  function open() {
    setIsOpen(true);
    setActiveIndex(0);
  }

  function close() {
    setIsOpen(false);
    setQuery("");
  }

  function choose(option: SearchableSelectOption<TValue>) {
    onValueChange(option.value);
    close();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) return open();
      setActiveIndex((index) => Math.min(index + 1, Math.max(visibleOptions.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      const option = visibleOptions[activeIndex];
      if (option) choose(option);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close();
    }
  }

  const activeOptionId = isOpen && visibleOptions[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        aria-describedby={ariaProps["aria-describedby"]}
        aria-invalid={ariaProps["aria-invalid"]}
        aria-required={ariaProps["aria-required"]}
        autoComplete="off"
        disabled={isDisabled}
        placeholder={placeholder ?? translateMessage("searchableSelect.placeholder")}
        value={isOpen ? query : (selectedOption?.label ?? "")}
        onFocus={open}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onBlur={close}
        className={cn(isClearable && selectedOption && "pe-8")}
      />
      {isClearable && selectedOption && !isOpen && (
        <button
          type="button"
          aria-label={translateMessage("searchableSelect.clear")}
          onClick={() => onValueChange(null)}
          className="absolute inset-y-0 end-2 my-auto h-5 rounded px-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      )}
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute start-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover py-1 text-sm text-popover-foreground shadow-md"
        >
          {visibleOptions.length === 0 && (
            <li className="px-3 py-2 text-muted-foreground">{translateMessage("searchableSelect.noResults")}</li>
          )}
          {visibleOptions.map((option, index) => (
            <li
              key={option.value}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              // mousedown (not click) so the choice happens before the input loses focus and closes the list
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "cursor-pointer px-3 py-2",
                index === activeIndex && "bg-accent text-accent-foreground",
                option.value === value && "font-medium",
              )}
            >
              <span>{option.label}</span>
              {option.description && <span className="ms-2 text-xs text-muted-foreground">{option.description}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
