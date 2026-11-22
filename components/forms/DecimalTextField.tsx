"use client";

import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";
import { FormField } from "./FormField";

export type DecimalTextFieldProps = {
  label: string;
  name: string;
  // The number, or null for an empty field. The parent owns the value.
  value: number | null;
  // Called with the parsed number (or null when emptied). Not called while the text is not a valid number.
  onValueChange: (value: number | null) => void;
  hint?: string;
  errorMessage?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
};

// The shared behaviour of WholeRupeeAmountField, QuantityField and PercentageField: a text input that accepts typing
// freely (including digit grouping and Urdu digits), reports a parsed number, shows an inline error for text that is
// not a valid number, and shows the formatted number again when the field loses focus.
export function DecimalTextField({
  label,
  name,
  value,
  onValueChange,
  hint,
  errorMessage,
  isRequired,
  isDisabled,
  parseText,
  formatNumber,
  invalidMessageKey,
  inputMode,
  prefix,
  suffix,
  allowsTrailingDecimalPoint = false,
}: DecimalTextFieldProps & {
  parseText: (text: string) => number | null;
  formatNumber: (value: number) => string;
  invalidMessageKey: MessageKey;
  inputMode: "numeric" | "decimal";
  prefix?: ReactNode;
  suffix?: ReactNode;
  // "1." is a number on its way to "1.5": not an error while typing, read as 1 until the person finishes.
  allowsTrailingDecimalPoint?: boolean;
}) {
  const { translateMessage } = useTranslation();
  const [text, setText] = useState(value === null ? "" : formatNumber(value));
  const [lastReportedValue, setLastReportedValue] = useState<number | null>(value);

  // The parent changed the value from outside (a reset, a calculation): show it.
  if (value !== lastReportedValue) {
    setLastReportedValue(value);
    setText(value === null ? "" : formatNumber(value));
  }

  const readable = (typed: string) => (allowsTrailingDecimalPoint ? typed.replace(/\.$/, "") : typed);
  const isBlank = text.trim() === "";
  const isInvalid = !isBlank && parseText(readable(text)) === null;

  function handleChange(nextText: string) {
    setText(nextText);
    if (nextText.trim() === "") {
      setLastReportedValue(null);
      onValueChange(null);
      return;
    }
    const parsed = parseText(readable(nextText));
    if (parsed !== null) {
      setLastReportedValue(parsed);
      onValueChange(parsed);
    }
  }

  function handleBlur() {
    const parsed = parseText(readable(text));
    if (parsed !== null) setText(formatNumber(parsed));
  }

  return (
    <FormField
      label={label}
      name={name}
      hint={hint}
      errorMessage={errorMessage ?? (isInvalid ? translateMessage(invalidMessageKey) : undefined)}
      isRequired={isRequired}
    >
      {(controlProps) => (
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-sm text-muted-foreground">
              {prefix}
            </span>
          )}
          <Input
            {...controlProps}
            type="text"
            inputMode={inputMode}
            autoComplete="off"
            disabled={isDisabled}
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            onBlur={handleBlur}
            className={cn("text-end tabular-nums", prefix && "ps-9", suffix && "pe-7")}
            dir="ltr"
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center text-sm text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
      )}
    </FormField>
  );
}
