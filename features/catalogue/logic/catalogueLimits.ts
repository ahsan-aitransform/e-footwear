// SINGLE SOURCE OF TRUTH FOR THE CATALOGUE LIMITS. They mirror the backend (EFootwear.Domain/Catalogue: ProductRules, VariantRules,
// CataloguePriceRules, PriceBandRules); the server checks every one of them again, so this file only gives early messages.

export const CatalogueLimits = {
  productNameMaximumLength: 200,
  descriptionMaximumLength: 4000,
  taxCodeMaximumLength: 40,
  weightMaximum: 9_999_999.999,
  taxRateMaximum: 100,
  sizeCodeMaximumLength: 20,
  barcodeMaximumLength: 48,
  maximumVariantsPerProduct: 200,
  maximumPrice: 999_999_999,
  increasePercentageMinimum: 0.01,
  increasePercentageMaximum: 1000,
  decreasePercentageMinimum: 0.01,
  decreasePercentageMaximumExclusive: 100,
  percentageDecimalPlaces: 2,
  priceBandNameMaximumLength: 80,
  priceBandSortOrderMaximum: 100_000,
  // The server refuses a bulk change that touches more products than this.
  maximumProductsPerBulkChange: 5000,
  maximumLabelCopiesPerSize: 500,
  maximumReplacementRows: 5000,
} as const;
