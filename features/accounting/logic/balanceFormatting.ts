import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { BalanceSideCodes, type BalanceSideCode } from "../types/voucherTypes";

// "Dr" and "Cr" already translated by the caller (they are accounting abbreviations, shown as words in Urdu).
export type BalanceSideWords = { debit: string; credit: string };

// A balance as the books print it: the amount and the side it stands on ("45,000 Cr"). A zero balance has no side.
export function formatAmountWithSide(amount: number, sideCode: BalanceSideCode, words: BalanceSideWords): string {
  if (amount === 0) return formatWholeRupees(0);
  return `${formatWholeRupees(amount)} ${sideCode === BalanceSideCodes.credit ? words.credit : words.debit}`;
}

// A debit or credit column cell: empty when the amount is zero, so a printed ledger shows only the side that moved.
export function formatColumnAmount(amount: number): string {
  return amount === 0 ? "" : formatWholeRupees(amount);
}
