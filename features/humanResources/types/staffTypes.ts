// Shapes of the staff API (GET /staff, GET /staff/{id}, PUT /staff/{id}/salary-terms, GET /staff/transfers). They mirror the C# records in
// EFootwear.BLL/HumanResources/Contracts. Money is a whole number of rupees; dates are "yyyy-MM-dd"; timestamps are ISO text.

export const PayFrequencyCodes = {
  monthly: "MONTHLY",
  biweekly: "BIWEEKLY",
  weekly: "WEEKLY",
} as const;

export type PayFrequencyCode = (typeof PayFrequencyCodes)[keyof typeof PayFrequencyCodes];

export const payFrequencyCodeList: readonly PayFrequencyCode[] = [PayFrequencyCodes.monthly, PayFrequencyCodes.biweekly, PayFrequencyCodes.weekly];

export function isPayFrequencyCode(text: string): text is PayFrequencyCode {
  return payFrequencyCodeList.some((code) => code === text);
}

export type StaffListItemResponse = {
  partyId: string;
  code: string;
  name: string;
  designation: string | null;
  isManager: boolean;
  currentStoreId: string;
  currentStoreName: string;
  baseSalary: number;
  payFrequencyCode: PayFrequencyCode;
  joinedOn: string | null;
  leftOn: string | null;
  partyStatusCode: string;
};

export type SalaryTermResponse = {
  id: string;
  effectiveFrom: string;
  baseSalary: number;
  payFrequencyCode: PayFrequencyCode;
  changedByUserId: string | null;
  changedByName: string | null;
  changedAt: string;
};

export type StaffTransferHistoryItemResponse = {
  id: string;
  fromStoreId: string | null;
  fromStoreName: string | null;
  toStoreId: string;
  toStoreName: string;
  effectiveOn: string;
  changedByUserId: string | null;
  changedByName: string | null;
  changedAt: string;
};

export type StaffDetailResponse = {
  profile: StaffListItemResponse;
  rowVersion: number;
  salaryTerms: SalaryTermResponse[];
  transferHistory: StaffTransferHistoryItemResponse[];
};

export type UpdateStaffSalaryTermsRequest = {
  baseSalary: number;
  payFrequencyCode: PayFrequencyCode;
  rowVersion: number;
};

export type StaffTransferListItemResponse = {
  id: string;
  partyId: string;
  staffCode: string;
  staffName: string;
  fromStoreId: string | null;
  fromStoreName: string | null;
  toStoreId: string;
  toStoreName: string;
  effectiveOn: string;
  changedByUserId: string | null;
  changedByName: string | null;
  changedAt: string;
};

// POST /parties/{partyId}/staff-transfers (the parties module owns the endpoint).
export type TransferStaffRequest = { toStoreId: string; effectiveOn: string };
