import { describe, expect, it } from "vitest";
import { PayrollStatusCodes, type PayrollSheetLineResponse } from "../types/payrollTypes";
import { calculateNetPay, calculateOutstanding, isLinePayable, maximumPaymentOf, summarizeSalaryLines } from "./salarySheetCalculations";

function line(overrides: Partial<PayrollSheetLineResponse>): PayrollSheetLineResponse {
  return {
    lineId: "line-1",
    staffId: "staff-1",
    employeeCode: "10300001",
    employeeName: "Imran",
    designation: "Manager",
    storeId: "store-1",
    storeName: "Kot Addu",
    baseSalary: 20_000,
    totalSales: 0,
    commissionAmount: 0,
    incentiveAmount: 0,
    deductionAmount: 0,
    netPay: 20_000,
    paidAmount: 0,
    outstandingAmount: 20_000,
    statusCode: PayrollStatusCodes.approved,
    ...overrides,
  };
}

describe("salary sheet arithmetic in whole rupees", () => {
  it("net pay is basic pay plus commission plus incentive minus deduction (the docx example: 20000 + 42429 = 62429)", () => {
    expect(calculateNetPay({ baseSalary: 20_000, commissionAmount: 42_429, incentiveAmount: 0, deductionAmount: 0 })).toBe(62_429);
    expect(calculateNetPay({ baseSalary: 20_000, commissionAmount: 0, incentiveAmount: 5_000, deductionAmount: 3_000 })).toBe(22_000);
  });

  it("a deduction larger than the pay gives a negative net pay instead of hiding it", () => {
    expect(calculateNetPay({ baseSalary: 1_000, commissionAmount: 0, incentiveAmount: 0, deductionAmount: 4_000 })).toBe(-3_000);
  });

  it("is exact for amounts that floating point would get wrong", () => {
    // 9007199254740 + 1 + 1 stays an exact integer; a floating point sum of cents would drift.
    expect(calculateNetPay({ baseSalary: 9_007_199_254_740, commissionAmount: 1, incentiveAmount: 1, deductionAmount: 0 })).toBe(9_007_199_254_742);
  });

  it("outstanding is net pay minus what was paid", () => {
    expect(calculateOutstanding(20_000, 8_000)).toBe(12_000);
    expect(calculateOutstanding(20_000, 20_000)).toBe(0);
  });

  it("refuses an amount that is not a whole number of rupees", () => {
    expect(() => calculateNetPay({ baseSalary: 100.5, commissionAmount: 0, incentiveAmount: 0, deductionAmount: 0 })).toThrow(RangeError);
  });

  it("totals every column of the lines", () => {
    const totals = summarizeSalaryLines([
      line({ baseSalary: 20_000, incentiveAmount: 5_000, deductionAmount: 2_000, netPay: 23_000, paidAmount: 3_000, outstandingAmount: 20_000, totalSales: 100_000 }),
      line({ lineId: "line-2", baseSalary: 30_000, commissionAmount: 4_000, netPay: 34_000, paidAmount: 0, outstandingAmount: 34_000, totalSales: 80_000 }),
    ]);

    expect(totals).toEqual({
      baseSalary: 50_000,
      totalSales: 180_000,
      commissionAmount: 4_000,
      incentiveAmount: 5_000,
      deductionAmount: 2_000,
      netPay: 57_000,
      paidAmount: 3_000,
      outstandingAmount: 54_000,
    });
  });

  it("totals nothing as zero", () => {
    expect(summarizeSalaryLines([]).netPay).toBe(0);
  });
});

describe("which lines can be paid", () => {
  it("only an approved line with something outstanding can be paid", () => {
    expect(isLinePayable(line({ statusCode: PayrollStatusCodes.approved, outstandingAmount: 100 }))).toBe(true);
    expect(isLinePayable(line({ statusCode: PayrollStatusCodes.draft, outstandingAmount: 100 }))).toBe(false);
    expect(isLinePayable(line({ statusCode: PayrollStatusCodes.paid, outstandingAmount: 0 }))).toBe(false);
    expect(isLinePayable(line({ statusCode: PayrollStatusCodes.approved, outstandingAmount: 0 }))).toBe(false);
    expect(isLinePayable(line({ statusCode: PayrollStatusCodes.cancelled, outstandingAmount: 100 }))).toBe(false);
  });

  it("the most that can be paid is what is outstanding on a payable line, otherwise nothing", () => {
    expect(maximumPaymentOf(line({ outstandingAmount: 12_000 }))).toBe(12_000);
    expect(maximumPaymentOf(line({ statusCode: PayrollStatusCodes.draft, outstandingAmount: 12_000 }))).toBe(0);
  });
});
