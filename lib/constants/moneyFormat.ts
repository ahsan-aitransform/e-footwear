// SINGLE SOURCE OF TRUTH FOR MONEY, QUANTITY AND PERCENTAGE FORMATS (decision D-009).
// Money is whole rupees: an integer number (core.money, bigint, in the database). Never a fraction, never a float.
// Quantities have up to 3 decimals (core.qty numeric(14,3)); percentages 0-100 with up to 4 decimals (core.pct).
// The helpers that use these constants are in lib/money/.

export const PAKISTANI_RUPEE_CURRENCY_CODE = "PKR";
export const PAKISTANI_RUPEE_SYMBOL = "Rs";

// Digit grouping used when showing whole rupees (en-PK groups in thousands: 1,250,000).
export const MONEY_DIGIT_GROUPING_LOCALE = "en-PK";

export const QUANTITY_MAXIMUM_DECIMAL_PLACES = 3;
export const PERCENTAGE_MAXIMUM_DECIMAL_PLACES = 4;
export const MINIMUM_PERCENTAGE = 0;
export const MAXIMUM_PERCENTAGE = 100;

// Matches platform.companies.rounding_mode. How a fraction of a rupee is rounded is a company setting.
export const RoundingModes = {
  floor: "FLOOR",
  nearest: "NEAREST",
} as const;

export type RoundingMode = (typeof RoundingModes)[keyof typeof RoundingModes];
