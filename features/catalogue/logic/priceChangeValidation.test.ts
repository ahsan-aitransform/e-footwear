import { describe, expect, it } from "vitest";
import { validateDiscountPercentage, validateOldToNewPrices, validatePercentagePriceChange, validateStockRange } from "./priceChangeValidation";

describe("percentage price change", () => {
  it("needs exactly one of increase and decrease", () => {
    expect(validatePercentagePriceChange(null, null)).toBe("catalogue.validation.percentRequired");
    expect(validatePercentagePriceChange(10, 5)).toBe("catalogue.validation.percentOnlyOne");
    expect(validatePercentagePriceChange(10, null)).toBeNull();
    expect(validatePercentagePriceChange(null, 10)).toBeNull();
  });

  it("limits the increase to 0.01-1000 and the decrease to below 100", () => {
    expect(validatePercentagePriceChange(1000, null)).toBeNull();
    expect(validatePercentagePriceChange(1000.01, null)).toBe("catalogue.validation.increaseRange");
    expect(validatePercentagePriceChange(0, null)).toBe("catalogue.validation.increaseRange");
    expect(validatePercentagePriceChange(null, 99.99)).toBeNull();
    expect(validatePercentagePriceChange(null, 100)).toBe("catalogue.validation.decreaseRange");
  });

  it("allows two decimals only", () => {
    expect(validatePercentagePriceChange(10.25, null)).toBeNull();
    expect(validatePercentagePriceChange(10.255, null)).toBe("catalogue.validation.percentDecimals");
  });
});

describe("discount percentage", () => {
  it("accepts 0.01 to 100 with two decimals", () => {
    expect(validateDiscountPercentage(null)).toBe("catalogue.validation.discountRequired");
    expect(validateDiscountPercentage(0)).toBe("catalogue.validation.discountRange");
    expect(validateDiscountPercentage(100)).toBeNull();
    expect(validateDiscountPercentage(100.01)).toBe("catalogue.validation.discountRange");
    expect(validateDiscountPercentage(12.5)).toBeNull();
  });
});

describe("old to new prices", () => {
  it("needs two different whole prices in range", () => {
    expect(validateOldToNewPrices(null, 5)).toBe("catalogue.validation.priceRequired");
    expect(validateOldToNewPrices(100, 100)).toBe("catalogue.validation.pricesAreEqual");
    expect(validateOldToNewPrices(100, 1_000_000_000)).toBe("catalogue.validation.priceRange");
    expect(validateOldToNewPrices(100, 150)).toBeNull();
  });
});

describe("stock range", () => {
  it("needs both limits with the minimum not above the maximum", () => {
    expect(validateStockRange(null, 5)).toBe("catalogue.validation.stockRangeRequired");
    expect(validateStockRange(10, 5)).toBe("catalogue.validation.stockRangeOrder");
    expect(validateStockRange(-1, 5)).toBe("catalogue.validation.stockRangeNegative");
    expect(validateStockRange(0, 5)).toBeNull();
  });
});
