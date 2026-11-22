import type { MessageKey } from "@/lib/i18n/messageKeys";
import { CatalogueLimits } from "./catalogueLimits";

export type PriceBandFormValues = {
  name: string;
  minimumPrice: number | null;
  maximumPrice: number | null;
  sortOrder: number | null;
};

export type PriceBandFormErrors = Partial<Record<keyof PriceBandFormValues, MessageKey>>;

// A price band is a named price range (for example "Up to 1,000"). The maximum may be empty ("and above"). Same rules as the backend PriceBandRules.
export function validatePriceBandForm(values: PriceBandFormValues): PriceBandFormErrors {
  const errors: PriceBandFormErrors = {};
  const name = values.name.trim();
  if (name === "") errors.name = "catalogue.priceBands.validation.nameRequired";
  else if (name.length > CatalogueLimits.priceBandNameMaximumLength) errors.name = "catalogue.priceBands.validation.nameTooLong";

  if (values.minimumPrice === null) errors.minimumPrice = "catalogue.priceBands.validation.minimumRequired";
  else if (values.minimumPrice < 0 || values.minimumPrice > CatalogueLimits.maximumPrice) errors.minimumPrice = "catalogue.validation.priceRange";

  if (values.maximumPrice !== null) {
    if (values.maximumPrice < 0 || values.maximumPrice > CatalogueLimits.maximumPrice) errors.maximumPrice = "catalogue.validation.priceRange";
    else if (values.minimumPrice !== null && values.maximumPrice < values.minimumPrice) errors.maximumPrice = "catalogue.priceBands.validation.maximumBelowMinimum";
  }

  if (values.sortOrder === null || !Number.isInteger(values.sortOrder) || values.sortOrder < 0 || values.sortOrder > CatalogueLimits.priceBandSortOrderMaximum)
    errors.sortOrder = "catalogue.priceBands.validation.sortOrderRange";
  return errors;
}

export function hasPriceBandFormErrors(errors: PriceBandFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
