import type { MessageKey } from "@/lib/i18n/messageKeys";
import { CatalogueLimits } from "./catalogueLimits";

function hasMoreDecimalsThanAllowed(value: number): boolean {
  return Math.round(value * 10 ** CatalogueLimits.percentageDecimalPlaces) / 10 ** CatalogueLimits.percentageDecimalPlaces !== value;
}

// Change Prices In % (docx 4.8): exactly one of "increase" and "decrease" is filled in.
export function validatePercentagePriceChange(increasePercent: number | null, decreasePercent: number | null): MessageKey | null {
  if (increasePercent === null && decreasePercent === null) return "catalogue.validation.percentRequired";
  if (increasePercent !== null && decreasePercent !== null) return "catalogue.validation.percentOnlyOne";
  if (increasePercent !== null) {
    if (increasePercent < CatalogueLimits.increasePercentageMinimum || increasePercent > CatalogueLimits.increasePercentageMaximum)
      return "catalogue.validation.increaseRange";
    if (hasMoreDecimalsThanAllowed(increasePercent)) return "catalogue.validation.percentDecimals";
  }
  if (decreasePercent !== null) {
    if (decreasePercent < CatalogueLimits.decreasePercentageMinimum || decreasePercent >= CatalogueLimits.decreasePercentageMaximumExclusive)
      return "catalogue.validation.decreaseRange";
    if (hasMoreDecimalsThanAllowed(decreasePercent)) return "catalogue.validation.percentDecimals";
  }
  return null;
}

// A discount percentage: 0.01 to 100 with at most 2 decimals (backend CataloguePriceRules.EnsureValidPercentage).
export function validateDiscountPercentage(discountPercent: number | null): MessageKey | null {
  if (discountPercent === null) return "catalogue.validation.discountRequired";
  if (discountPercent < 0.01 || discountPercent > 100) return "catalogue.validation.discountRange";
  if (hasMoreDecimalsThanAllowed(discountPercent)) return "catalogue.validation.percentDecimals";
  return null;
}

// Change Prices Old to New (docx 4.7): both prices are whole rupees within the allowed range and they must differ.
export function validateOldToNewPrices(oldPrice: number | null, newPrice: number | null): MessageKey | null {
  if (oldPrice === null || newPrice === null) return "catalogue.validation.priceRequired";
  if (oldPrice < 0 || newPrice < 0 || oldPrice > CatalogueLimits.maximumPrice || newPrice > CatalogueLimits.maximumPrice)
    return "catalogue.validation.priceRange";
  if (oldPrice === newPrice) return "catalogue.validation.pricesAreEqual";
  return null;
}

// A fixed amount off: whole rupees above zero.
export function validateDiscountAmount(discountAmount: number | null): MessageKey | null {
  if (discountAmount === null) return "catalogue.validation.discountAmountRequired";
  if (discountAmount < 1 || discountAmount > CatalogueLimits.maximumPrice) return "catalogue.validation.discountAmountRange";
  return null;
}

// The optional stock range of Change Discounts (docx 4.9): neither end is negative and the minimum is not above the maximum.
export function validateStockRange(minimumStock: number | null, maximumStock: number | null): MessageKey | null {
  if ((minimumStock ?? 0) < 0 || (maximumStock ?? 0) < 0) return "catalogue.validation.stockRangeNegative";
  if (minimumStock !== null && maximumStock !== null && minimumStock > maximumStock) return "catalogue.validation.stockRangeOrder";
  return null;
}
