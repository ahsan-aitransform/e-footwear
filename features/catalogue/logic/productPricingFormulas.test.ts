import { describe, expect, it } from "vitest";
import { calculateMarginPercent, calculateMarkupPercent, calculateNetPrice } from "./productPricingFormulas";

describe("product pricing formulas", () => {
  it("subtracts the discount from the sale price and never goes below zero", () => {
    expect(calculateNetPrice(1000, 100)).toBe(900);
    expect(calculateNetPrice(100, 500)).toBe(0);
  });

  it("calculates margin and markup like the document examples", () => {
    expect(calculateMarginPercent(1000, 600)).toBe(40);
    expect(calculateMarkupPercent(1000, 600)).toBe(66.67);
    expect(calculateMarginPercent(500, 600)).toBe(-20);
    expect(calculateMarkupPercent(500, 600)).toBe(-16.67);
  });

  it("rounds half away from zero to two decimals", () => {
    // (3 - 1) / 3 = 66.666..., (1 - 3) / 3 = -66.666...
    expect(calculateMarginPercent(3, 1)).toBe(66.67);
    expect(calculateMarginPercent(1, 3)).toBe(-200);
    expect(calculateMarkupPercent(1, 3)).toBe(-66.67);
  });

  it("returns null when the base is zero", () => {
    expect(calculateMarginPercent(0, 100)).toBeNull();
    expect(calculateMarkupPercent(100, 0)).toBeNull();
  });
});
