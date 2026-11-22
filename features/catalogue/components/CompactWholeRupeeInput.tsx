"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatWholeRupees, parseWholeRupeeInput } from "@/lib/money/wholeRupeeAmount";

// A whole-rupee input for a table cell (no label frame; the column header and aria-label name it). Same rules as WholeRupeeAmountField:
// digits with grouping, no decimals; an invalid text is marked and not reported.
export function CompactWholeRupeeInput({
  value,
  onValueChange,
  ariaLabel,
  isDisabled = false,
  isInvalid = false,
}: {
  value: number | null;
  onValueChange: (value: number | null) => void;
  ariaLabel: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
}) {
  const [text, setText] = useState(value === null ? "" : formatWholeRupees(value, { withSymbol: false }));
  const [lastReported, setLastReported] = useState<number | null>(value);
  // The parent changed the value from outside (a range was added, a form was loaded): show it.
  if (value !== lastReported) {
    setLastReported(value);
    setText(value === null ? "" : formatWholeRupees(value, { withSymbol: false }));
  }
  const isBadText = text.trim() !== "" && parseWholeRupeeInput(text) === null;

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      dir="ltr"
      className="w-28 text-end tabular-nums"
      aria-label={ariaLabel}
      aria-invalid={isInvalid || isBadText ? true : undefined}
      disabled={isDisabled}
      value={text}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        if (next.trim() === "") {
          setLastReported(null);
          onValueChange(null);
          return;
        }
        const parsed = parseWholeRupeeInput(next);
        if (parsed !== null) {
          setLastReported(parsed);
          onValueChange(parsed);
        }
      }}
      onBlur={() => {
        const parsed = parseWholeRupeeInput(text);
        if (parsed !== null) setText(formatWholeRupees(parsed, { withSymbol: false }));
      }}
    />
  );
}
