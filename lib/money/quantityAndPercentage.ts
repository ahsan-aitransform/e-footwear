// Parsing and formatting of quantities (up to 3 decimals) and percentages (0-100, up to 4 decimals) typed by people.
// The values stay decimal numbers; arithmetic that touches money goes through lib/money/wholeRupeeAmount.ts.
import {
  MAXIMUM_PERCENTAGE,
  MINIMUM_PERCENTAGE,
  MONEY_DIGIT_GROUPING_LOCALE,
  PERCENTAGE_MAXIMUM_DECIMAL_PLACES,
  QUANTITY_MAXIMUM_DECIMAL_PLACES,
} from "@/lib/constants/moneyFormat";

function normaliseDecimalText(text: string): string {
  return text
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .trim()
    .replace(/[,\s]/g, "");
}

function parseDecimal(text: string, maximumDecimals: number): number | null {
  const cleaned = normaliseDecimalText(text);
  const match = /^-?\d+(?:\.(\d+))?$/.exec(cleaned);
  if (!match) return null;
  if ((match[1]?.length ?? 0) > maximumDecimals) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function parseQuantityInput(text: string): number | null {
  return parseDecimal(text, QUANTITY_MAXIMUM_DECIMAL_PLACES);
}

export function parsePercentageInput(text: string): number | null {
  const value = parseDecimal(text, PERCENTAGE_MAXIMUM_DECIMAL_PLACES);
  if (value === null) return null;
  return value >= MINIMUM_PERCENTAGE && value <= MAXIMUM_PERCENTAGE ? value : null;
}

// Shows a quantity without needless trailing zeros: 12 -> "12", 2.5 -> "2.5", 0.125 -> "0.125".
export function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat(MONEY_DIGIT_GROUPING_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: QUANTITY_MAXIMUM_DECIMAL_PLACES,
  }).format(quantity);
}

export function formatPercentageNumber(percentage: number): string {
  return new Intl.NumberFormat(MONEY_DIGIT_GROUPING_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: PERCENTAGE_MAXIMUM_DECIMAL_PLACES,
  }).format(percentage);
}

export function formatPercentage(percentage: number): string {
  return `${formatPercentageNumber(percentage)}%`;
}
