// The arithmetic of the sale screens. It mirrors the database function sales.post_sale_invoice exactly, so the totals on screen are the totals that get
// stored (whole rupees, BigInt inside lib/money, rounded the way the company rounds: FLOOR or NEAREST, passed in explicitly, never a hidden default):
//   discount per unit = percent of the charged price (rounded) or the typed rupees;  charged = price - discount per unit;
//   line total = quantity x charged (rounded);  gross = quantity x shelf price (rounded);  discount = gross - net.
import type { RoundingMode } from "@/lib/constants/moneyFormat";
import { applyPercentageToWholeRupees, multiplyWholeRupeesByQuantity, quantityToThousandths, sumWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { SaleLineDiscountTypeCodes, SalePaymentMethodCodes, type SaleLineDiscountTypeCode, type SalePaymentMethodCode } from "../types/saleTypes";

export type SaleLineCalculationInput = {
  quantity: number;
  // The shelf price of the item (store price or list price): "Gross" is quantity x this.
  listPrice: number;
  // The price on the line before the manual discount (the suggested price, lowered by a promotion, unless the cashier changed it).
  unitPrice: number;
  discountTypeCode: SaleLineDiscountTypeCode;
  discountValue: number | null;
};

export type SaleLineAmounts = {
  discountPerUnit: number;
  chargedUnitPrice: number;
  grossAmount: number;
  netAmount: number;
  discountAmount: number;
};

export function calculateDiscountPerUnit(
  unitPrice: number,
  discountTypeCode: SaleLineDiscountTypeCode,
  discountValue: number | null,
  roundingMode: RoundingMode,
): number {
  if (discountTypeCode === SaleLineDiscountTypeCodes.none || discountValue === null || discountValue <= 0) return 0;
  if (discountTypeCode === SaleLineDiscountTypeCodes.percent) return applyPercentageToWholeRupees(unitPrice, discountValue, roundingMode);
  return discountValue;
}

export function calculateSaleLineAmounts(line: SaleLineCalculationInput, roundingMode: RoundingMode): SaleLineAmounts {
  const discountPerUnit = calculateDiscountPerUnit(line.unitPrice, line.discountTypeCode, line.discountValue, roundingMode);
  const chargedUnitPrice = line.unitPrice - discountPerUnit;
  const grossAmount = multiplyWholeRupeesByQuantity(line.listPrice, line.quantity, roundingMode);
  const netAmount = multiplyWholeRupeesByQuantity(chargedUnitPrice, line.quantity, roundingMode);
  return { discountPerUnit, chargedUnitPrice, grossAmount, netAmount, discountAmount: grossAmount - netAmount };
}

export type SaleTotals = {
  totalQuantity: number;
  lineCount: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
};

export function calculateSaleTotals(lines: readonly SaleLineCalculationInput[], roundingMode: RoundingMode): SaleTotals {
  const amounts = lines.map((line) => calculateSaleLineAmounts(line, roundingMode));
  const grossAmount = sumWholeRupees(amounts.map((amount) => amount.grossAmount));
  const netAmount = sumWholeRupees(amounts.map((amount) => amount.netAmount));
  let totalThousandths = BigInt(0);
  for (const line of lines) totalThousandths += quantityToThousandths(line.quantity);
  return {
    totalQuantity: Number(totalThousandths) / 1000,
    lineCount: lines.length,
    grossAmount,
    discountAmount: grossAmount - netAmount,
    netAmount,
  };
}

export type PaymentEntryRow = {
  paymentMethodCode: SalePaymentMethodCode;
  paymentAccountId: string;
  // What the customer handed over for this row (the "Cash Received" of the docx).
  receivedAmount: number;
  referenceNumber: string | null;
};

export type PaymentSplit = {
  receivedAmount: number;
  keptAmount: number;
  changeAmount: number;
  outstandingAmount: number;
  // Change can only be handed back out of cash: more change than cash received is a mistake the screen must stop.
  isChangeCoveredByCash: boolean;
  // The rows the server wants: each amount is what stays in the shop (received minus the change taken from the cash rows, last row first).
  keptRows: PaymentEntryRow[];
};

export function splitPaymentsAfterChange(rows: readonly PaymentEntryRow[], netAmount: number): PaymentSplit {
  const receivedAmount = sumWholeRupees(rows.map((row) => row.receivedAmount));
  const changeAmount = Math.max(0, receivedAmount - netAmount);
  const cashReceived = sumWholeRupees(rows.filter((row) => row.paymentMethodCode === SalePaymentMethodCodes.cash).map((row) => row.receivedAmount));
  let changeLeftToTake = changeAmount;
  const keptRows = rows.map((row) => ({ ...row }));
  for (let index = keptRows.length - 1; index >= 0 && changeLeftToTake > 0; index -= 1) {
    if (keptRows[index].paymentMethodCode !== SalePaymentMethodCodes.cash) continue;
    const taken = Math.min(keptRows[index].receivedAmount, changeLeftToTake);
    keptRows[index].receivedAmount -= taken;
    changeLeftToTake -= taken;
  }
  return {
    receivedAmount,
    keptAmount: receivedAmount - changeAmount,
    changeAmount,
    outstandingAmount: Math.max(0, netAmount - receivedAmount),
    isChangeCoveredByCash: changeAmount <= cashReceived,
    keptRows: keptRows.filter((row) => row.receivedAmount > 0),
  };
}

// What a returned quantity of a sale line is worth: the price the customer paid per unit (after discounts) x the quantity.
export function calculateReturnedLineAmount(paidUnitPrice: number, quantity: number, roundingMode: RoundingMode): number {
  return multiplyWholeRupeesByQuantity(paidUnitPrice, quantity, roundingMode);
}

export type ExchangeAmounts = {
  returnAmount: number;
  newSaleAmount: number;
  // New sale minus return. Above zero the customer pays it; below zero the customer is owed it.
  differenceAmount: number;
  customerPaysAmount: number;
  customerIsOwedAmount: number;
};

export function calculateExchangeAmounts(returnAmount: number, newSaleAmount: number): ExchangeAmounts {
  const differenceAmount = newSaleAmount - returnAmount;
  return {
    returnAmount,
    newSaleAmount,
    differenceAmount,
    customerPaysAmount: Math.max(0, differenceAmount),
    customerIsOwedAmount: Math.max(0, -differenceAmount),
  };
}
