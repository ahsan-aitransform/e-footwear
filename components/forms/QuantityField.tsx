"use client";

import { formatQuantity, parseQuantityInput } from "@/lib/money/quantityAndPercentage";
import { DecimalTextField, type DecimalTextFieldProps } from "./DecimalTextField";

// A quantity field: up to 3 decimals (pieces, kilograms, metres).
export function QuantityField(props: DecimalTextFieldProps) {
  return (
    <DecimalTextField
      {...props}
      parseText={parseQuantityInput}
      formatNumber={formatQuantity}
      invalidMessageKey="fields.invalidQuantity"
      inputMode="decimal"
      allowsTrailingDecimalPoint
    />
  );
}
