import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";

// "1,200 → 1,500" for a change, "1,500" for a first price, "1,500 - 1,700" when sizes differ, "-" when this price did not change.
export function formatPriceChange(oldPrice: number | null, newLowest: number | null, newHighest: number | null): string {
  if (newLowest === null || newHighest === null) return "-";
  const format = (amount: number) => formatWholeRupees(amount, { withSymbol: false });
  const newText = newLowest === newHighest ? format(newLowest) : `${format(newLowest)} - ${format(newHighest)}`;
  return oldPrice === null ? newText : `${format(oldPrice)} → ${newText}`;
}
