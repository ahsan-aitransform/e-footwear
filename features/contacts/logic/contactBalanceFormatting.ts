import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";

// A balance is one signed whole-rupee number: positive = they owe the business (receivable), negative = the business owes them
// (payable). The screen shows the size of the amount and the word, never a minus sign on its own.
export function formatContactBalance(
  balanceAmount: number,
  words: { receivable: string; payable: string },
): string {
  if (balanceAmount === 0) return formatWholeRupees(0);
  const word = balanceAmount > 0 ? words.receivable : words.payable;
  return `${formatWholeRupees(Math.abs(balanceAmount))} ${word}`;
}
