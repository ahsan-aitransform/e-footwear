// Shapes of the party API (backend EFootwear.BLL/Parties/Contracts). Money is whole rupees; dates are "YYYY-MM-DD".

export const PartyStatusCodes = { active: "ACTIVE", inactive: "INACTIVE" } as const;
export const PartyTypeFilterCodes = { all: "ALL", customer: "CUSTOMER", vendor: "VENDOR", staff: "STAFF" } as const;
export type PartyTypeFilterCode = (typeof PartyTypeFilterCodes)[keyof typeof PartyTypeFilterCodes];
export const OpeningBalanceSideCodes = { debit: "DEBIT", credit: "CREDIT" } as const;
export type OpeningBalanceSideCode = (typeof OpeningBalanceSideCodes)[keyof typeof OpeningBalanceSideCodes];

export type PartyOpeningBalance = { sideCode: OpeningBalanceSideCode; amount: number; asOfDate: string };

export type PartyListItemResponse = {
  id: string;
  code: string;
  name: string;
  nameUrdu: string | null;
  fatherName: string | null;
  cnic: string | null;
  address: string | null;
  cityId: string | null;
  cityName: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  designation: string | null;
  isCustomer: boolean;
  isVendor: boolean;
  isStaff: boolean;
  statusCode: string;
  // Positive = the party owes the business (receivable), negative = the business owes the party.
  balanceAmount: number;
  rowVersion: number;
};

export type PartyLookupItemResponse = {
  id: string;
  code: string;
  name: string;
  nameUrdu: string | null;
  primaryPhone: string | null;
  isCustomer: boolean;
  isVendor: boolean;
  isStaff: boolean;
};

export type PartyDetailResponse = {
  id: string;
  code: string;
  name: string;
  nameUrdu: string | null;
  fatherName: string | null;
  fatherNameUrdu: string | null;
  cnic: string | null;
  cityId: string | null;
  cityName: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  email: string | null;
  address: string | null;
  addressUrdu: string | null;
  notes: string | null;
  isCustomer: boolean;
  isVendor: boolean;
  isStaff: boolean;
  creditLimit: number | null;
  statusCode: string;
  designation: string | null;
  isManager: boolean;
  staffStoreId: string | null;
  staffStoreName: string | null;
  createdAt: string;
  balanceAmount: number;
  openingBalance: PartyOpeningBalance | null;
  rowVersion: number;
};

export type SavePartyRequest = {
  name: string;
  nameUrdu: string | null;
  fatherName: string | null;
  fatherNameUrdu: string | null;
  cnic: string | null;
  cityId: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  email: string | null;
  address: string | null;
  addressUrdu: string | null;
  notes: string | null;
  isCustomer: boolean;
  isVendor: boolean;
  isStaff: boolean;
  creditLimit: number | null;
  statusCode: string;
  designation: string | null;
  isManager: boolean;
  staffStoreId: string | null;
  openingBalance: PartyOpeningBalance | null;
};

export type UpdatePartyRequest = SavePartyRequest & { rowVersion: number };

export type PartyLedgerLineResponse = {
  lineId: string;
  partyId: string;
  partyCode: string;
  partyName: string;
  entryDate: string;
  sourceType: string;
  documentNumber: number | null;
  description: string | null;
  debitAmount: number;
  creditAmount: number;
  runningBalanceAmount: number;
};

export type PartyLedgerResponse = {
  partyId: string | null;
  openingBalanceAmount: number;
  lines: { items: PartyLedgerLineResponse[]; page: number; pageSize: number; totalCount: number };
  totalDebitAmount: number;
  totalCreditAmount: number;
  closingBalanceAmount: number;
};
