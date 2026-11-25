// Shapes shared by the customer, vendor and staff APIs (backend EFootwear.BLL/Contacts and the three feature contracts).
// Money is whole rupees; dates are "YYYY-MM-DD".

export const ContactStatusCodes = { active: "ACTIVE", inactive: "INACTIVE" } as const;
export const OpeningBalanceSideCodes = { debit: "DEBIT", credit: "CREDIT" } as const;
export type OpeningBalanceSideCode = (typeof OpeningBalanceSideCodes)[keyof typeof OpeningBalanceSideCodes];
export type ContactKind = "customer" | "vendor" | "staff";

export type ContactOpeningBalance = { sideCode: OpeningBalanceSideCode; amount: number; asOfDate: string };

// A row of View / Search for any of the three kinds. The vendor and staff fields are absent on the other kinds.
export type ContactListItemResponse = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  cityId: string | null;
  cityName: string | null;
  statusCode: string;
  // Positive = they owe the business (receivable), negative = the business owes them (payable).
  balanceAmount: number;
  rowVersion: number;
  creditLimit?: number | null;
  designation?: string | null;
  isManager?: boolean;
  storeId?: string;
  storeName?: string | null;
};

export type ContactLookupItemResponse = { id: string; code: string; name: string; phone: string | null };

export type ContactDetailResponse = ContactListItemResponse & {
  createdAt: string;
  openingBalance: ContactOpeningBalance | null;
  joinedOn?: string | null;
  leftOn?: string | null;
};

export type SaveContactRequest = {
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  cityId: string | null;
  statusCode: string;
  openingBalance: ContactOpeningBalance | null;
  creditLimit?: number | null;
  designation?: string | null;
  isManager?: boolean;
  storeId?: string | null;
};

export type UpdateContactRequest = SaveContactRequest & { rowVersion: number };

export type ContactLedgerLineResponse = {
  lineId: string;
  entryDate: string;
  sourceType: string;
  documentNumber: number | null;
  description: string | null;
  debitAmount: number;
  creditAmount: number;
  runningBalanceAmount: number;
};

export type ContactLedgerResponse = {
  openingBalanceAmount: number;
  lines: { items: ContactLedgerLineResponse[]; page: number; pageSize: number; totalCount: number };
  totalDebitAmount: number;
  totalCreditAmount: number;
  closingBalanceAmount: number;
};
