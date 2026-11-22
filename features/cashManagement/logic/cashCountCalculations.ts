import type { CashCountDenominationLine } from "../types/cashTypes";

// The notes and coins of Pakistani rupees the cash calculator counts (docx 3.6). The server holds the same list.
export const CashDenominationValues = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1] as const;

// Counted notes per denomination, as typed (a missing key = nothing counted).
export type NoteCountsByDenomination = Readonly<Record<number, number | undefined>>;

export function calculateDenominationAmount(denomination: number, noteCount: number | undefined): number {
  return denomination * Math.max(0, Math.trunc(noteCount ?? 0));
}

// The total of the counted notes: sum of denomination x count, in whole rupees.
export function calculateCountedCash(noteCounts: NoteCountsByDenomination): number {
  return CashDenominationValues.reduce((total, denomination) => total + calculateDenominationAmount(denomination, noteCounts[denomination]), 0);
}

// Counted minus expected: negative = cash is short, positive = cash is over.
export function calculateCashDifference(countedCash: number, expectedCash: number): number {
  return countedCash - expectedCash;
}

export type CashDifferenceKind = "balanced" | "short" | "over";

export function classifyCashDifference(differenceAmount: number): CashDifferenceKind {
  if (differenceAmount === 0) return "balanced";
  return differenceAmount < 0 ? "short" : "over";
}

// Only the denominations that were actually counted go to the server.
export function toDenominationLines(noteCounts: NoteCountsByDenomination): CashCountDenominationLine[] {
  return CashDenominationValues.filter((denomination) => (noteCounts[denomination] ?? 0) > 0).map((denomination) => ({
    denomination,
    noteCount: Math.trunc(noteCounts[denomination] ?? 0),
  }));
}

export function toNoteCounts(lines: readonly CashCountDenominationLine[]): Record<number, number> {
  return Object.fromEntries(lines.map((line) => [line.denomination, line.noteCount]));
}

// A typed note count: whole numbers from 0 up. Empty text is "nothing counted"; anything else invalid is null (not accepted).
export function parseNoteCountText(text: string): number | undefined | null {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  if (!/^\d{1,7}$/.test(trimmed)) return null;
  return Number(trimmed);
}
