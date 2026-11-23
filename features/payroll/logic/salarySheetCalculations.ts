import { sumWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { PayrollStatusCodes, type PayrollSheetLineResponse } from "../types/payrollTypes";

// The arithmetic of a salary sheet in whole rupees (decision D-009), the same formulas the database uses for the generated columns of hr.payroll_lines:
//   net pay = basic pay + commission + incentive - deduction        outstanding = net pay - paid
// The screens only show what the server calculated; these functions check it and total the lines, using exact integer arithmetic (no floating point).

export function calculateNetPay(parts: { baseSalary: number; commissionAmount: number; incentiveAmount: number; deductionAmount: number }): number {
  return sumWholeRupees([parts.baseSalary, parts.commissionAmount, parts.incentiveAmount, -parts.deductionAmount]);
}

export function calculateOutstanding(netPay: number, paidAmount: number): number {
  return sumWholeRupees([netPay, -paidAmount]);
}

export type SalarySheetTotals = {
  baseSalary: number;
  totalSales: number;
  commissionAmount: number;
  incentiveAmount: number;
  deductionAmount: number;
  netPay: number;
  paidAmount: number;
  outstandingAmount: number;
};

export function summarizeSalaryLines(lines: readonly PayrollSheetLineResponse[]): SalarySheetTotals {
  return {
    baseSalary: sumWholeRupees(lines.map((line) => line.baseSalary)),
    totalSales: sumWholeRupees(lines.map((line) => line.totalSales)),
    commissionAmount: sumWholeRupees(lines.map((line) => line.commissionAmount)),
    incentiveAmount: sumWholeRupees(lines.map((line) => line.incentiveAmount)),
    deductionAmount: sumWholeRupees(lines.map((line) => line.deductionAmount)),
    netPay: sumWholeRupees(lines.map((line) => line.netPay)),
    paidAmount: sumWholeRupees(lines.map((line) => line.paidAmount)),
    outstandingAmount: sumWholeRupees(lines.map((line) => line.outstandingAmount)),
  };
}

// Salary can be paid only on an approved line that still has something outstanding; a draft is not owed yet.
export function isLinePayable(line: Pick<PayrollSheetLineResponse, "statusCode" | "outstandingAmount">): boolean {
  return line.statusCode === PayrollStatusCodes.approved && line.outstandingAmount > 0;
}

export function maximumPaymentOf(line: Pick<PayrollSheetLineResponse, "statusCode" | "outstandingAmount">): number {
  return isLinePayable(line) ? line.outstandingAmount : 0;
}
