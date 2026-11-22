import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";

// A party balance is one signed whole-rupee number: positive = the party owes the business (receivable), negative = the
// business owes the party (payable). The screen shows the size of the amount and the word, never a minus sign on its own.
export function formatPartyBalance(
  balanceAmount: number,
  words: { receivable: string; payable: string },
): string {
  if (balanceAmount === 0) return formatWholeRupees(0);
  const word = balanceAmount > 0 ? words.receivable : words.payable;
  return `${formatWholeRupees(Math.abs(balanceAmount))} ${word}`;
}
