"use client";

import { PAKISTANI_RUPEE_SYMBOL } from "@/lib/constants/moneyFormat";
import { formatWholeRupees, parseWholeRupeeInput } from "@/lib/money/wholeRupeeAmount";
import { DecimalTextField, type DecimalTextFieldProps } from "./DecimalTextField";

// A money field in whole rupees (decision D-009): digits only, grouping accepted (1,250,000), no decimals.
// The value is an integer number of rupees, never a fraction.
export function WholeRupeeAmountField(props: DecimalTextFieldProps) {
  return (
    <DecimalTextField
      {...props}
      parseText={parseWholeRupeeInput}
      formatNumber={(value) => formatWholeRupees(value, { withSymbol: false })}
      invalidMessageKey="fields.invalidWholeRupees"
      inputMode="numeric"
      prefix={PAKISTANI_RUPEE_SYMBOL}
    />
  );
}
