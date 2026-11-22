"use client";

import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { BooleanSelectValues } from "../settingsFormValues";

export type SelectOption = { value: string; label: string };

// A dropdown whose first entry means "not configured" (or "use the company value" for a store). The value "" is that entry.
export function OptionalSelectField({
  label,
  name,
  value,
  onChange,
  options,
  emptyOptionLabel,
  hint,
  errorMessage,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  emptyOptionLabel: string;
  hint?: string;
  errorMessage?: string;
}) {
  return (
    <FormField label={label} name={name} hint={hint} errorMessage={errorMessage}>
      {(controlProps) => (
        <NativeSelect {...controlProps} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{emptyOptionLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      )}
    </FormField>
  );
}

// Yes / No / not configured.
export function OptionalBooleanSelectField(props: Omit<Parameters<typeof OptionalSelectField>[0], "options">) {
  const { translateMessage } = useTranslation();
  return (
    <OptionalSelectField
      {...props}
      options={[
        { value: BooleanSelectValues.yes, label: translateMessage("common.yes") },
        { value: BooleanSelectValues.no, label: translateMessage("common.no") },
      ]}
    />
  );
}
