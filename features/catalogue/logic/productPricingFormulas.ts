// Net price, margin and markup of a product row. Same formulas and rounding as the backend (ProductPricingFormulas):
//   net    = sale price - discount (never below 0)
//   margin = (net - purchase) / net x 100
//   markup = (net - purchase) / purchase x 100
// Rounded to 2 decimals, half away from zero. Done with BigInt so no floating-point error touches a money value.

const ZERO = BigInt(0);
const TWO = BigInt(2);
const ONE = BigInt(1);
const PERCENT_SCALE = BigInt(10_000); // percent x 100 (two decimals)

export function calculateNetPrice(salePrice: number, discountAmount: number): number {
  return Math.max(salePrice - discountAmount, 0);
}

function percentOf(difference: bigint, base: bigint): number | null {
  if (base === ZERO) return null;
  const numerator = difference * PERCENT_SCALE;
  let quotient = numerator / base;
  const remainder = numerator % base;
  const twiceRemainder = (remainder < ZERO ? -remainder : remainder) * TWO;
  const absoluteBase = base < ZERO ? -base : base;
  if (twiceRemainder >= absoluteBase) quotient += (numerator < ZERO) !== (base < ZERO) ? -ONE : ONE;
  return Number(quotient) / 100;
}

export function calculateMarginPercent(netPrice: number, purchasePrice: number): number | null {
  return percentOf(BigInt(netPrice) - BigInt(purchasePrice), BigInt(netPrice));
}

export function calculateMarkupPercent(netPrice: number, purchasePrice: number): number | null {
  return percentOf(BigInt(netPrice) - BigInt(purchasePrice), BigInt(purchasePrice));
}
