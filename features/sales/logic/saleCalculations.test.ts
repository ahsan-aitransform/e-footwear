import { describe, expect, it } from "vitest";
import {
  calculateDiscountPerUnit,
  calculateExchangeAmounts,
  calculateReturnedLineAmount,
  calculateSaleLineAmounts,
  calculateSaleTotals,
  splitPaymentsAfterChange,
  type PaymentEntryRow,
} from "./saleCalculations";
import { SaleLineDiscountTypeCodes, SalePaymentMethodCodes } from "../types/saleTypes";

const none = SaleLineDiscountTypeCodes.none;
const percent = SaleLineDiscountTypeCodes.percent;
const amount = SaleLineDiscountTypeCodes.amount;

describe("sale line arithmetic (mirrors sales.post_sale_invoice)", () => {
  it("multiplies quantity by price with no discount", () => {
    expect(calculateSaleLineAmounts({ quantity: 2, listPrice: 1000, unitPrice: 1000, discountTypeCode: none, discountValue: null }, "FLOOR")).toEqual({
      discountPerUnit: 0,
      chargedUnitPrice: 1000,
      grossAmount: 2000,
      netAmount: 2000,
      discountAmount: 0,
    });
  });

  it("takes a percent discount per unit and rounds it by the company mode", () => {
    // 10% of 1039 = 103.9 -> FLOOR 103, NEAREST 104 (per unit, before the quantity is applied)
    expect(calculateDiscountPerUnit(1039, percent, 10, "FLOOR")).toBe(103);
    expect(calculateDiscountPerUnit(1039, percent, 10, "NEAREST")).toBe(104);
    const floorLine = calculateSaleLineAmounts({ quantity: 3, listPrice: 1039, unitPrice: 1039, discountTypeCode: percent, discountValue: 10 }, "FLOOR");
    expect(floorLine.netAmount).toBe(3 * (1039 - 103));
    expect(floorLine.discountAmount).toBe(3 * 103);
  });

  it("takes a rupee discount per unit as typed", () => {
    const line = calculateSaleLineAmounts({ quantity: 2, listPrice: 1500, unitPrice: 1500, discountTypeCode: amount, discountValue: 200 }, "FLOOR");
    expect(line.netAmount).toBe(2600);
    expect(line.discountAmount).toBe(400);
  });

  it("counts a promotion price as a discount against the shelf price", () => {
    const line = calculateSaleLineAmounts({ quantity: 1, listPrice: 2000, unitPrice: 1800, discountTypeCode: none, discountValue: null }, "FLOOR");
    expect(line.discountAmount).toBe(200);
    expect(line.netAmount).toBe(1800);
  });

  it("handles a fractional quantity with the company rounding", () => {
    expect(calculateSaleLineAmounts({ quantity: 1.5, listPrice: 999, unitPrice: 999, discountTypeCode: none, discountValue: null }, "FLOOR").netAmount).toBe(1498);
    expect(calculateSaleLineAmounts({ quantity: 1.5, listPrice: 999, unitPrice: 999, discountTypeCode: none, discountValue: null }, "NEAREST").netAmount).toBe(1499);
  });

  it("totals the lines: quantity, items, gross, discount and net", () => {
    const totals = calculateSaleTotals(
      [
        { quantity: 2, listPrice: 1000, unitPrice: 1000, discountTypeCode: percent, discountValue: 10 },
        { quantity: 1, listPrice: 500, unitPrice: 500, discountTypeCode: none, discountValue: null },
      ],
      "FLOOR",
    );
    expect(totals).toEqual({ totalQuantity: 3, lineCount: 2, grossAmount: 2500, discountAmount: 200, netAmount: 2300 });
  });

  it("never produces a fraction of a rupee", () => {
    const totals = calculateSaleTotals([{ quantity: 0.333, listPrice: 1001, unitPrice: 1001, discountTypeCode: none, discountValue: null }], "NEAREST");
    expect(Number.isInteger(totals.netAmount)).toBe(true);
  });
});

describe("payment split and change", () => {
  const cash = (receivedAmount: number): PaymentEntryRow => ({
    paymentMethodCode: SalePaymentMethodCodes.cash,
    paymentAccountId: "cash-account",
    receivedAmount,
    referenceNumber: null,
  });
  const card = (receivedAmount: number): PaymentEntryRow => ({
    paymentMethodCode: SalePaymentMethodCodes.card,
    paymentAccountId: "bank-account",
    receivedAmount,
    referenceNumber: null,
  });

  it("returns the change out of the cash and keeps only the bill", () => {
    const split = splitPaymentsAfterChange([cash(2500)], 2000);
    expect(split.changeAmount).toBe(500);
    expect(split.keptAmount).toBe(2000);
    expect(split.outstandingAmount).toBe(0);
    expect(split.keptRows).toHaveLength(1);
    expect(split.keptRows[0].receivedAmount).toBe(2000);
    expect(split.isChangeCoveredByCash).toBe(true);
  });

  it("takes the change from the cash rows and leaves card rows alone", () => {
    const split = splitPaymentsAfterChange([card(1000), cash(1200)], 2000);
    expect(split.changeAmount).toBe(200);
    expect(split.keptRows.map((row) => [row.paymentMethodCode, row.receivedAmount])).toEqual([
      ["CARD", 1000],
      ["CASH", 1000],
    ]);
  });

  it("flags change that the cash cannot cover (a card overpayment)", () => {
    const split = splitPaymentsAfterChange([card(2500)], 2000);
    expect(split.changeAmount).toBe(500);
    expect(split.isChangeCoveredByCash).toBe(false);
  });

  it("shows what is still unpaid when the payment is short", () => {
    const split = splitPaymentsAfterChange([cash(500)], 2000);
    expect(split.outstandingAmount).toBe(1500);
    expect(split.changeAmount).toBe(0);
  });

  it("treats no payment as everything unpaid", () => {
    expect(splitPaymentsAfterChange([], 800)).toMatchObject({ outstandingAmount: 800, keptAmount: 0, keptRows: [] });
  });
});

describe("return and exchange amounts", () => {
  it("values a return at the price the customer paid per unit", () => {
    expect(calculateReturnedLineAmount(900, 2, "FLOOR")).toBe(1800);
  });

  it("makes the customer pay the difference when the new items cost more", () => {
    expect(calculateExchangeAmounts(1000, 1500)).toEqual({
      returnAmount: 1000,
      newSaleAmount: 1500,
      differenceAmount: 500,
      customerPaysAmount: 500,
      customerIsOwedAmount: 0,
    });
  });

  it("owes the customer the difference when the new items cost less", () => {
    const amounts = calculateExchangeAmounts(1500, 1000);
    expect(amounts.differenceAmount).toBe(-500);
    expect(amounts.customerIsOwedAmount).toBe(500);
    expect(amounts.customerPaysAmount).toBe(0);
  });

  it("is even when the amounts are equal", () => {
    expect(calculateExchangeAmounts(1000, 1000).differenceAmount).toBe(0);
  });
});
