"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type OptionSelectOption = { value: string; label: string };

// The value the list uses for "nothing chosen" (the empty option). The component reports "" for it.
const EMPTY_OPTION_VALUE = "__empty__";

// A short fixed list as a dropdown, built on the shadcn Select. The value is the option's value, or "" when nothing is chosen
// (shown as the empty option when emptyOptionLabel is given). Put it inside a FormField to get a label and an error message:
//   <FormField label="Type" name="type">{(p) => <OptionSelect {...p} options={types} value={type} onValueChange={setType} />}</FormField>
// Use SearchableSelect instead for a long list the person should be able to type into.
export function OptionSelect({
  id,
  name,
  options,
  value,
  onValueChange,
  emptyOptionLabel,
  isDisabled = false,
  className,
  ...ariaProps
}: {
  id?: string;
  name?: string;
  options: readonly OptionSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  emptyOptionLabel?: string;
  isDisabled?: boolean;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
}) {
  const items = emptyOptionLabel === undefined ? options : [{ value: EMPTY_OPTION_VALUE, label: emptyOptionLabel }, ...options];
  const currentValue = value === "" && emptyOptionLabel !== undefined ? EMPTY_OPTION_VALUE : value === "" ? null : value;
  return (
    <Select
      name={name}
      items={items}
      value={currentValue}
      disabled={isDisabled}
      onValueChange={(next) => onValueChange(next === null || next === EMPTY_OPTION_VALUE ? "" : String(next))}
    >
      <SelectTrigger
        id={id}
        className={cn("w-full", className)}
        aria-describedby={ariaProps["aria-describedby"]}
        aria-invalid={ariaProps["aria-invalid"]}
        aria-required={ariaProps["aria-required"]}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {items.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
