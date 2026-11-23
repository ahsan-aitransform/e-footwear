// Shapes of the payroll API (salary sheets, adjustments, salary payments and the two payroll reports). They mirror the C# records in
// EFootwear.BLL/Payroll/Contracts. Money is a whole number of rupees; dates are "yyyy-MM-dd"; timestamps are ISO text.

export const PayrollStatusCodes = {
  draft: "DRAFT",
  approved: "APPROVED",
  paid: "PAID",
  cancelled: "CANCELLED",
} as const;

export type PayrollStatusCode = (typeof PayrollStatusCodes)[keyof typeof PayrollStatusCodes];

export const PayrollAdjustmentTypeCodes = {
  incentive: "INCENTIVE",
  deduction: "DEDUCTION",
  advance: "ADVANCE",
} as const;

export type PayrollAdjustmentTypeCode = (typeof PayrollAdjustmentTypeCodes)[keyof typeof PayrollAdjustmentTypeCodes];

export const payrollAdjustmentTypeCodeList: readonly PayrollAdjustmentTypeCode[] = [
  PayrollAdjustmentTypeCodes.incentive,
  PayrollAdjustmentTypeCodes.deduction,
  PayrollAdjustmentTypeCodes.advance,
];

export const SalaryPaymentMethodCodes = {
  cash: "CASH",
  bank: "BANK",
  other: "OTHER",
} as const;

export type SalaryPaymentMethodCode = (typeof SalaryPaymentMethodCodes)[keyof typeof SalaryPaymentMethodCodes];

export const salaryPaymentMethodCodeList: readonly SalaryPaymentMethodCode[] = [
  SalaryPaymentMethodCodes.cash,
  SalaryPaymentMethodCodes.bank,
  SalaryPaymentMethodCodes.other,
];

export function isPayrollAdjustmentTypeCode(text: string): text is PayrollAdjustmentTypeCode {
  return payrollAdjustmentTypeCodeList.some((code) => code === text);
}

export function isSalaryPaymentMethodCode(text: string): text is SalaryPaymentMethodCode {
  return salaryPaymentMethodCodeList.some((code) => code === text);
}

export type PayrollSheetLineResponse = {
  lineId: string;
  employeePartyId: string;
  employeeCode: string;
  employeeName: string;
  designation: string | null;
  storeId: string;
  storeName: string;
  baseSalary: number;
  totalSales: number;
  commissionAmount: number;
  incentiveAmount: number;
  deductionAmount: number;
  netPay: number;
  paidAmount: number;
  outstandingAmount: number;
  statusCode: PayrollStatusCode;
};

export type PayrollSheetResponse = {
  runId: string;
  storeId: string;
  storeName: string;
  periodMonth: string;
  statusCode: PayrollStatusCode;
  approvedByUserId: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rowVersion: number;
  lines: PayrollSheetLineResponse[];
  totalBaseSalary: number;
  totalCommission: number;
  totalIncentive: number;
  totalDeduction: number;
  totalNetPay: number;
  totalPaid: number;
  totalOutstanding: number;
};

export type PrepareSalarySheetRequest = { storeId: string; month: string };

export type PayrollAdjustmentResponse = {
  id: string;
  employeePartyId: string;
  employeeName: string;
  periodMonth: string;
  adjustmentTypeCode: PayrollAdjustmentTypeCode;
  amount: number;
  reason: string | null;
  isOnSalarySheet: boolean;
  createdAt: string;
};

export type CreatePayrollAdjustmentRequest = {
  employeePartyId: string;
  month: string;
  adjustmentTypeCode: PayrollAdjustmentTypeCode;
  amount: number;
  reason: string | null;
};

export type PaySalaryRequest = {
  amount: number;
  methodCode: SalaryPaymentMethodCode;
  paidOn: string;
  reference: string | null;
  clientTransactionId: string;
};

export type SalaryPaymentResponse = {
  id: string;
  payrollLineId: string;
  employeePartyId: string;
  employeeName: string;
  storeId: string;
  storeName: string;
  periodMonth: string;
  paidOn: string;
  amount: number;
  methodCode: SalaryPaymentMethodCode;
  reference: string | null;
  paidByUserId: string | null;
  paidByName: string | null;
  createdAt: string;
};

export type CreatedIdResponse = { id: string };

export type StaffSalaryReportRowResponse = {
  periodMonth: string;
  storeId: string;
  storeName: string;
  employeePartyId: string;
  employeeCode: string;
  employeeName: string;
  designation: string | null;
  baseSalary: number;
  commissionAmount: number;
  incentiveAmount: number;
  deductionAmount: number;
  netPay: number;
  paidAmount: number;
  outstandingAmount: number;
  statusCode: PayrollStatusCode;
};

export type StaffSalaryReportResponse = {
  rows: StaffSalaryReportRowResponse[];
  totalBaseSalary: number;
  totalCommission: number;
  totalIncentive: number;
  totalDeduction: number;
  totalNetPay: number;
  totalPaid: number;
  totalOutstanding: number;
  lineCount: number;
  isTruncated: boolean;
};

export type SalaryOutstandingReportRowResponse = {
  periodMonth: string;
  storeId: string;
  storeName: string;
  employeePartyId: string;
  employeeName: string;
  netPay: number;
  paidAmount: number;
  outstandingAmount: number;
};

export type SalaryOutstandingReportResponse = {
  rows: SalaryOutstandingReportRowResponse[];
  totalNetPay: number;
  totalPaid: number;
  totalOutstanding: number;
  lineCount: number;
  isTruncated: boolean;
};

// The limits the server also enforces (EFootwear.Domain/Payroll/PayrollRules): the screens check them first for a quick message.
export const PayrollLimits = {
  adjustmentReasonMaximumLength: 300,
  paymentReferenceMaximumLength: 100,
} as const;
