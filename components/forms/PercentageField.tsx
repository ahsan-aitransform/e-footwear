"use client";

import { formatPercentageNumber, parsePercentageInput } from "@/lib/money/quantityAndPercentage";
import { DecimalTextField, type DecimalTextFieldProps } from "./DecimalTextField";

// A percentage field: 0 to 100, up to 4 decimals. Values outside the range are reported as invalid.
export function PercentageField(props: DecimalTextFieldProps) {
  return (
    <DecimalTextField
      {...props}
      parseText={parsePercentageInput}
      formatNumber={formatPercentageNumber}
      invalidMessageKey="fields.invalidPercentage"
      inputMode="decimal"
      allowsTrailingDecimalPoint
      suffix="%"
    />
  );
}
