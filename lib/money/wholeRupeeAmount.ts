// Whole-rupee money (decision D-009). Money is an integer number of rupees. There are no paisa anywhere.
// Every calculation that could produce a fraction (quantity x price, percentage of an amount) is done with BigInt
// integers and rounded exactly like the database function core.round_money:
//   FLOOR   = floor(value)  (towards negative infinity)
//   NEAREST = round(value)  (half away from zero, PostgreSQL numeric round)
// Never use toFixed, Math.round or floating-point multiplication on money.
import {
  MONEY_DIGIT_GROUPING_LOCALE,
  PAKISTANI_RUPEE_SYMBOL,
  PERCENTAGE_MAXIMUM_DECIMAL_PLACES,
  QUANTITY_MAXIMUM_DECIMAL_PLACES,
  RoundingModes,
  type RoundingMode,
} from "@/lib/constants/moneyFormat";

const QUANTITY_SCALE = BigInt(10) ** BigInt(QUANTITY_MAXIMUM_DECIMAL_PLACES);
const PERCENTAGE_SCALE = BigInt(10) ** BigInt(PERCENTAGE_MAXIMUM_DECIMAL_PLACES);
const PERCENT_DENOMINATOR = BigInt(100);
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);

const wholeRupeeFormatter = new Intl.NumberFormat(MONEY_DIGIT_GROUPING_LOCALE, { maximumFractionDigits: 0 });

export function isWholeRupeeAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

export function assertWholeRupeeAmount(value: number, what = "amount"): number {
  if (!isWholeRupeeAmount(value)) throw new RangeError(`The ${what} must be a whole number of rupees, got ${value}.`);
  return value;
}

// 1250000 -> "Rs 1,250,000"; -500 -> "-Rs 500".
export function formatWholeRupees(amount: number, options: { withSymbol?: boolean } = {}): string {
  assertWholeRupeeAmount(amount);
  const withSymbol = options.withSymbol ?? true;
  const digits = wholeRupeeFormatter.format(Math.abs(amount));
  const sign = amount < 0 ? "-" : "";
  return withSymbol ? `${sign}${PAKISTANI_RUPEE_SYMBOL} ${digits}` : `${sign}${digits}`;
}

// Digits of other scripts (Urdu keyboards type Eastern Arabic-Indic digits) are accepted and read as 0-9.
function normaliseDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٬،]/g, ",");
}

// Reads what a person typed. Accepts digit grouping (1,250,000) and a leading minus. Returns null for empty text,
// for anything with a decimal part ("12.5"), and for values too large to be represented exactly.
export function parseWholeRupeeInput(text: string): number | null {
  const cleaned = normaliseDigits(text).trim().replace(/[,\s]/g, "");
  if (!/^-?\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isSafeInteger(value) ? value : null;
}

export function sumWholeRupees(amounts: readonly number[]): number {
  let total = ZERO;
  for (const amount of amounts) total += BigInt(assertWholeRupeeAmount(amount));
  return toSafeNumber(total);
}

// Quantities have at most 3 decimals. The number is converted to thousandths without floating-point error.
export function quantityToThousandths(quantity: number | string): bigint {
  const text = typeof quantity === "number" ? numberToPlainDecimalText(quantity) : quantity.trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new RangeError(`"${quantity}" is not a valid quantity.`);
  const [, sign, whole, fraction = ""] = match;
  if (fraction.length > QUANTITY_MAXIMUM_DECIMAL_PLACES) {
    throw new RangeError(`A quantity has at most ${QUANTITY_MAXIMUM_DECIMAL_PLACES} decimals, got "${quantity}".`);
  }
  const scaled = BigInt(whole + fraction.padEnd(QUANTITY_MAXIMUM_DECIMAL_PLACES, "0"));
  return sign === "-" ? -scaled : scaled;
}

// Percentages have at most 4 decimals (core.pct numeric(7,4)).
export function percentageToTenThousandths(percentage: number | string): bigint {
  const text = typeof percentage === "number" ? numberToPlainDecimalText(percentage) : percentage.trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new RangeError(`"${percentage}" is not a valid percentage.`);
  const [, sign, whole, fraction = ""] = match;
  if (fraction.length > PERCENTAGE_MAXIMUM_DECIMAL_PLACES) {
    throw new RangeError(`A percentage has at most ${PERCENTAGE_MAXIMUM_DECIMAL_PLACES} decimals, got "${percentage}".`);
  }
  const scaled = BigInt(whole + fraction.padEnd(PERCENTAGE_MAXIMUM_DECIMAL_PLACES, "0"));
  return sign === "-" ? -scaled : scaled;
}

// Unit price (whole rupees) x quantity -> whole rupees, rounded the way the company rounding mode says.
export function multiplyWholeRupeesByQuantity(
  amount: number,
  quantity: number | string,
  roundingMode: RoundingMode,
): number {
  const product = BigInt(assertWholeRupeeAmount(amount)) * quantityToThousandths(quantity);
  return toSafeNumber(divideAndRound(product, QUANTITY_SCALE, roundingMode));
}

// amount x percentage / 100, rounded the way the company rounding mode says. Example: 10% of 1039 = 103.9.
export function applyPercentageToWholeRupees(
  amount: number,
  percentage: number | string,
  roundingMode: RoundingMode,
): number {
  const product = BigInt(assertWholeRupeeAmount(amount)) * percentageToTenThousandths(percentage);
  return toSafeNumber(divideAndRound(product, PERCENTAGE_SCALE * PERCENT_DENOMINATOR, roundingMode));
}

// numerator / denominator for a positive denominator, rounded to a whole number.
function divideAndRound(numerator: bigint, denominator: bigint, roundingMode: RoundingMode): bigint {
  let quotient = numerator / denominator; // BigInt division truncates towards zero
  const remainder = numerator % denominator;
  if (remainder === ZERO) return quotient;

  if (roundingMode === RoundingModes.floor) {
    return remainder < ZERO ? quotient - ONE : quotient;
  }
  // NEAREST: half away from zero
  const twiceRemainderMagnitude = (remainder < ZERO ? -remainder : remainder) * TWO;
  if (twiceRemainderMagnitude >= denominator) quotient += numerator < ZERO ? -ONE : ONE;
  return quotient;
}

function toSafeNumber(value: bigint): number {
  const asNumber = Number(value);
  if (!Number.isSafeInteger(asNumber)) throw new RangeError("The amount is too large to be represented exactly.");
  return asNumber;
}

// 0.001 -> "0.001" (String(1e-7) would give exponent notation, which is not a quantity).
function numberToPlainDecimalText(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError(`"${value}" is not a number.`);
  const text = String(value);
  if (!/e/i.test(text)) return text;
  return value.toFixed(PERCENTAGE_MAXIMUM_DECIMAL_PLACES + QUANTITY_MAXIMUM_DECIMAL_PLACES);
}
