import { describe, expect, it } from "vitest";
import { hasPriceBandFormErrors, validatePriceBandForm } from "./priceBandValidation";

const valid = { name: "Up to 1,000", minimumPrice: 0, maximumPrice: 1000, sortOrder: 10 };

describe("price band form validation", () => {
  it("accepts a band with and without a maximum", () => {
    expect(hasPriceBandFormErrors(validatePriceBandForm(valid))).toBe(false);
    expect(hasPriceBandFormErrors(validatePriceBandForm({ ...valid, maximumPrice: null }))).toBe(false);
  });

  it("needs a name and a minimum price", () => {
    const errors = validatePriceBandForm({ ...valid, name: " ", minimumPrice: null });
    expect(errors.name).toBe("catalogue.priceBands.validation.nameRequired");
    expect(errors.minimumPrice).toBe("catalogue.priceBands.validation.minimumRequired");
  });

  it("refuses a maximum below the minimum and prices above the limit", () => {
    expect(validatePriceBandForm({ ...valid, minimumPrice: 500, maximumPrice: 400 }).maximumPrice).toBe("catalogue.priceBands.validation.maximumBelowMinimum");
    expect(validatePriceBandForm({ ...valid, maximumPrice: 1_000_000_000 }).maximumPrice).toBe("catalogue.validation.priceRange");
  });

  it("needs a whole sort order in range", () => {
    expect(validatePriceBandForm({ ...valid, sortOrder: null }).sortOrder).toBe("catalogue.priceBands.validation.sortOrderRange");
    expect(validatePriceBandForm({ ...valid, sortOrder: 1.5 }).sortOrder).toBe("catalogue.priceBands.validation.sortOrderRange");
    expect(validatePriceBandForm({ ...valid, sortOrder: 100_001 }).sortOrder).toBe("catalogue.priceBands.validation.sortOrderRange");
  });
});
