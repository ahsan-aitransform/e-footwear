// Shapes of the commissions API (plans, entries, approval and the two commission reports). They mirror the C# records in
// EFootwear.BLL/Commissions/Contracts. Money is a whole number of rupees; a percentage is a number from 0 to 100; dates are "yyyy-MM-dd".

export const CommissionPlanAppliesToCodes = {
  salesman: "SALESMAN",
  manager: "MANAGER",
} as const;

export type CommissionPlanAppliesToCode = (typeof CommissionPlanAppliesToCodes)[keyof typeof CommissionPlanAppliesToCodes];

export const commissionPlanAppliesToCodeList: readonly CommissionPlanAppliesToCode[] = [
  CommissionPlanAppliesToCodes.salesman,
  CommissionPlanAppliesToCodes.manager,
];

export const CommissionBasisCodes = {
  netSale: "NET_SALE",
  grossMargin: "GROSS_MARGIN",
} as const;

export type CommissionBasisCode = (typeof CommissionBasisCodes)[keyof typeof CommissionBasisCodes];

export const commissionBasisCodeList: readonly CommissionBasisCode[] = [CommissionBasisCodes.netSale, CommissionBasisCodes.grossMargin];

export const CommissionCalculationTypeCodes = {
  percent: "PERCENT",
  fixedPerPiece: "FIXED_PER_PIECE",
} as const;

export type CommissionCalculationTypeCode = (typeof CommissionCalculationTypeCodes)[keyof typeof CommissionCalculationTypeCodes];

export const commissionCalculationTypeCodeList: readonly CommissionCalculationTypeCode[] = [
  CommissionCalculationTypeCodes.percent,
  CommissionCalculationTypeCodes.fixedPerPiece,
];

export const CommissionRuleScopeCodes = {
  product: "PRODUCT",
  category: "CATEGORY",
  priceBand: "PRICE_BAND",
} as const;

export type CommissionRuleScopeCode = (typeof CommissionRuleScopeCodes)[keyof typeof CommissionRuleScopeCodes];

export const CommissionEntryStatusCodes = {
  pending: "PENDING",
  approved: "APPROVED",
  onHold: "ON_HOLD",
  paid: "PAID",
  cancelled: "CANCELLED",
} as const;

export type CommissionEntryStatusCode = (typeof CommissionEntryStatusCodes)[keyof typeof CommissionEntryStatusCodes];

// The statuses a person can filter the entries by (cancelled entries are never listed unless asked for).
export const commissionEntryStatusFilterCodeList: readonly CommissionEntryStatusCode[] = [
  CommissionEntryStatusCodes.pending,
  CommissionEntryStatusCodes.approved,
  CommissionEntryStatusCodes.onHold,
  CommissionEntryStatusCodes.paid,
  CommissionEntryStatusCodes.cancelled,
];

export const CommissionEntryTypeCodes = {
  earn: "EARN",
  reversal: "REVERSAL",
} as const;

export function isCommissionPlanAppliesToCode(text: string): text is CommissionPlanAppliesToCode {
  return commissionPlanAppliesToCodeList.some((code) => code === text);
}

export function isCommissionBasisCode(text: string): text is CommissionBasisCode {
  return commissionBasisCodeList.some((code) => code === text);
}

export function isCommissionCalculationTypeCode(text: string): text is CommissionCalculationTypeCode {
  return commissionCalculationTypeCodeList.some((code) => code === text);
}

export type CommissionPlanMemberResponse = { staffId: string; staffCode: string; staffName: string };

export type CommissionRuleResponse = {
  id: string;
  scopeCode: string;
  productId: string | null;
  productName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  priceBandId: string | null;
  priceBandName: string | null;
  calculationTypeCode: string;
  rate: number | null;
  fixedAmountPerPiece: number | null;
  minimumLineAmount: number;
  priority: number;
  validFrom: string;
  validTo: string | null;
};

export type CommissionPlanResponse = {
  id: string;
  name: string;
  appliesToCode: string;
  basisCode: string;
  calculationTypeCode: string;
  defaultRate: number | null;
  defaultFixedAmountPerPiece: number | null;
  minimumStoreSales: number;
  storeId: string | null;
  storeName: string | null;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  memberCount: number;
  ruleCount: number;
  members: CommissionPlanMemberResponse[];
  rules: CommissionRuleResponse[];
  rowVersion: number;
};

export type SaveCommissionPlanRequest = {
  name: string;
  appliesToCode: string;
  basisCode: string;
  calculationTypeCode: string;
  defaultRate: number | null;
  defaultFixedAmountPerPiece: number | null;
  minimumStoreSales: number;
  storeId: string | null;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  memberStaffIds: string[];
  rowVersion: number | null;
};

export type SaveCommissionRuleRequest = {
  scopeCode: string;
  productId: string | null;
  categoryId: string | null;
  priceBandId: string | null;
  calculationTypeCode: string;
  rate: number | null;
  fixedAmountPerPiece: number | null;
  minimumLineAmount: number;
  priority: number;
  validFrom: string;
  validTo: string | null;
};

export type EndCommissionRuleRequest = { validTo: string };

export type CommissionEntryResponse = {
  id: string;
  storeId: string;
  storeName: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  planId: string;
  planName: string;
  saleDate: string;
  invoiceId: string;
  invoiceNumber: number;
  entryTypeCode: string;
  calculationTypeCode: string;
  rate: number | null;
  fixedAmountPerPiece: number | null;
  quantity: number;
  baseAmount: number;
  commissionAmount: number;
  statusCode: string;
  approvedAt: string | null;
  salaryMonth: string | null;
};

export type CommissionEntryTotalsResponse = {
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  totalAmount: number;
  entryCount: number;
};

export type ApproveCommissionsRequest = { storeId: string; fromDate: string; toDate: string };

export type ApproveCommissionsResponse = { approvedEntryCount: number };

export type CommissionSummaryRowResponse = {
  staffId: string;
  staffCode: string;
  staffName: string;
  baseAmount: number;
  earnedAmount: number;
  reversedAmount: number;
  netAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
};

export type CommissionSummaryReportResponse = {
  rows: CommissionSummaryRowResponse[];
  totalBaseAmount: number;
  totalEarnedAmount: number;
  totalReversedAmount: number;
  totalNetAmount: number;
  totalPendingAmount: number;
  totalApprovedAmount: number;
  totalPaidAmount: number;
  staffCount: number;
  isRowLimitReached: boolean;
};

export type CommissionDetailReportResponse = {
  rows: CommissionEntryResponse[];
  totalBaseAmount: number;
  totalCommissionAmount: number;
  entryCount: number;
  isRowLimitReached: boolean;
};

// The staff pickers read /staff-members/lookup (no permission needed beyond being signed in), so a person who plans commission need not hold the staff screens.
export type StaffLookupResponse = { id: string; code: string; name: string; phone: string | null; storeId: string };

// Limits the server also checks (EFootwear.Domain/Commissions/CommissionRules); a quick message here saves a round trip.
export const CommissionLimits = {
  planNameMaximumLength: 120,
  maximumPercentage: 100,
} as const;
