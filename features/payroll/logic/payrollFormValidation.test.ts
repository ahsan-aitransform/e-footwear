import { describe, expect, it } from "vitest";
import { hasAdjustmentFormErrors, validateAdjustmentForm } from "./adjustmentFormValidation";
import { hasPaymentFormErrors, validatePaymentForm } from "./paymentFormValidation";

describe("salary payment form", () => {
  const valid = { amount: 5_000, methodCode: "CASH", paidOn: "2026-11-05", reference: "" };

  it("accepts a payment up to the outstanding amount", () => {
    expect(hasPaymentFormErrors(validatePaymentForm(valid, 12_000))).toBe(false);
    expect(hasPaymentFormErrors(validatePaymentForm({ ...valid, amount: 12_000 }, 12_000))).toBe(false);
  });

  it("refuses an empty, zero or negative amount", () => {
    expect(validatePaymentForm({ ...valid, amount: null }, 12_000).amount?.messageKey).toBe("payroll.pay.error.amount");
    expect(validatePaymentForm({ ...valid, amount: 0 }, 12_000).amount?.messageKey).toBe("payroll.pay.error.amount");
    expect(validatePaymentForm({ ...valid, amount: -5 }, 12_000).amount?.messageKey).toBe("payroll.pay.error.amount");
  });

  it("refuses more than what is outstanding and names the outstanding amount", () => {
    const error = validatePaymentForm({ ...valid, amount: 12_001 }, 12_000).amount;
    expect(error?.messageKey).toBe("payroll.pay.error.tooMuch");
    expect(error?.parameters).toEqual({ outstanding: "Rs 12,000" });
  });

  it("refuses an unknown method, a bad date and a too long reference", () => {
    const errors = validatePaymentForm({ amount: 100, methodCode: "CHEQUE", paidOn: "2026-02-30", reference: "x".repeat(101) }, 12_000);
    expect(errors.methodCode?.messageKey).toBe("payroll.pay.error.method");
    expect(errors.paidOn?.messageKey).toBe("payroll.pay.error.date");
    expect(errors.reference?.parameters).toEqual({ maximum: 100 });
  });
});

describe("payroll adjustment form", () => {
  it("accepts an incentive, a deduction and an advance with a positive whole amount", () => {
    for (const adjustmentTypeCode of ["INCENTIVE", "DEDUCTION", "ADVANCE"]) {
      expect(hasAdjustmentFormErrors(validateAdjustmentForm({ adjustmentTypeCode, amount: 1_000, reason: "Eid bonus" }))).toBe(false);
    }
  });

  it("refuses an unknown kind, no amount and a too long reason", () => {
    const errors = validateAdjustmentForm({ adjustmentTypeCode: "BONUS", amount: null, reason: "x".repeat(301) });
    expect(errors.adjustmentTypeCode?.messageKey).toBe("payroll.adjustment.error.type");
    expect(errors.amount?.messageKey).toBe("payroll.adjustment.error.amount");
    expect(errors.reason?.parameters).toEqual({ maximum: 300 });
  });

  it("refuses a zero or negative amount", () => {
    expect(validateAdjustmentForm({ adjustmentTypeCode: "INCENTIVE", amount: 0, reason: "" }).amount).toBeDefined();
    expect(validateAdjustmentForm({ adjustmentTypeCode: "INCENTIVE", amount: -1, reason: "" }).amount).toBeDefined();
  });
});
