"use client";

import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { FormField } from "./FormField";

// "2026-11-20" is valid; "2026-02-30" and "20/11/2026" are not.
export function isValidIsoDate(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// A date field (the browser's own date picker). The value is an ISO date "YYYY-MM-DD" or "" for no date. Business dates
// are plain calendar dates, so no time zone arithmetic is involved.
export function DateField({
  label,
  name,
  value,
  onValueChange,
  minimumIsoDate,
  maximumIsoDate,
  hint,
  errorMessage,
  isRequired,
  isDisabled,
}: {
  label: string;
  name: string;
  value: string;
  onValueChange: (isoDate: string) => void;
  minimumIsoDate?: string;
  maximumIsoDate?: string;
  hint?: string;
  errorMessage?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
}) {
  const { translateMessage } = useTranslation();
  const isInvalid = value !== "" && !isValidIsoDate(value);
  return (
    <FormField
      label={label}
      name={name}
      hint={hint}
      errorMessage={errorMessage ?? (isInvalid ? translateMessage("fields.invalidDate") : undefined)}
      isRequired={isRequired}
    >
      {(controlProps) => (
        <Input
          {...controlProps}
          type="date"
          value={value}
          min={minimumIsoDate}
          max={maximumIsoDate}
          disabled={isDisabled}
          onChange={(event) => onValueChange(event.target.value)}
          dir="ltr"
        />
      )}
    </FormField>
  );
}
