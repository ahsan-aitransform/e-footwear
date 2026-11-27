import { describe, expect, it } from "vitest";
import { formatPriceChange } from "./priceHistoryFormatting";

describe("formatPriceChange", () => {
  it("shows a first price, a change, differing sizes and an unchanged price", () => {
    expect(formatPriceChange(null, 1500, 1500)).toBe("1,500");
    expect(formatPriceChange(1200, 1500, 1500)).toBe("1,200 → 1,500");
    expect(formatPriceChange(null, 1500, 1700)).toBe("1,500 - 1,700");
    expect(formatPriceChange(null, null, null)).toBe("-");
  });
});
