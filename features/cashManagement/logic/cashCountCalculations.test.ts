import { describe, expect, it } from "vitest";
import {
  calculateCashDifference,
  calculateCountedCash,
  calculateDenominationAmount,
  classifyCashDifference,
  parseNoteCountText,
  toDenominationLines,
  toNoteCounts,
} from "./cashCountCalculations";

describe("cash count calculations", () => {
  it("multiplies each denomination by its note count", () => {
    expect(calculateDenominationAmount(5000, 3)).toBe(15_000);
    expect(calculateDenominationAmount(50, undefined)).toBe(0);
    expect(calculateDenominationAmount(100, -4)).toBe(0);
  });

  it("totals the counted cash in whole rupees", () => {
    expect(calculateCountedCash({ 5000: 2, 1000: 1, 500: 3, 100: 4, 1: 7 })).toBe(10_000 + 1_000 + 1_500 + 400 + 7);
    expect(calculateCountedCash({})).toBe(0);
  });

  it("ignores counts for denominations that are not in use", () => {
    expect(calculateCountedCash({ 5000: 1, 75: 10 })).toBe(5_000);
  });

  it("tells short, over and balanced apart", () => {
    expect(calculateCashDifference(9_000, 10_000)).toBe(-1_000);
    expect(classifyCashDifference(-1_000)).toBe("short");
    expect(classifyCashDifference(250)).toBe("over");
    expect(classifyCashDifference(0)).toBe("balanced");
  });

  it("sends only counted denominations, largest first, and reads them back", () => {
    const lines = toDenominationLines({ 100: 2, 5000: 1, 10: 0 });
    expect(lines).toEqual([
      { denomination: 5000, noteCount: 1 },
      { denomination: 100, noteCount: 2 },
    ]);
    expect(toNoteCounts(lines)).toEqual({ 5000: 1, 100: 2 });
  });

  it("parses typed counts: empty is nothing, letters and decimals are refused", () => {
    expect(parseNoteCountText("")).toBeUndefined();
    expect(parseNoteCountText(" 12 ")).toBe(12);
    expect(parseNoteCountText("1.5")).toBeNull();
    expect(parseNoteCountText("-3")).toBeNull();
    expect(parseNoteCountText("abc")).toBeNull();
  });
});
