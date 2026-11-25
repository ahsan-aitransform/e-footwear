import type { PaginatedResponse } from "@/lib/types/pagination";
import type { BalanceSideCode } from "./voucherTypes";

// Shapes of the account report, accounting period and cash and bank APIs (backend EFootwear.BLL/Accounting/Contracts).
// Every figure is derived from journal lines by the server. Amounts are whole rupees, always positive, with a side next to them.

export type AccountLookupItemResponse = {
  accountId: string;
  code: string;
  title: string;
  mainTypeCode: string;
  groupCode: string;
  groupTitle: string;
  storeId: string;
  storeName: string;
};

export type AccountLedgerRowResponse = {
  entryDate: string;
  entryId: string;
  sourceTypeCode: string;
  description: string | null;
  contactKindCode: string | null;
  customerId: string | null;
  vendorId: string | null;
  staffId: string | null;
  debitAmount: number;
  creditAmount: number;
  runningBalanceAmount: number;
  runningBalanceSideCode: BalanceSideCode;
};

export type AccountLedgerResponse = {
  account: AccountLookupItemResponse;
  fromDate: string;
  toDate: string;
  storeId: string | null;
  openingBalanceAmount: number;
  openingBalanceSideCode: BalanceSideCode;
  totalDebitAmount: number;
  totalCreditAmount: number;
  closingBalanceAmount: number;
  closingBalanceSideCode: BalanceSideCode;
  lines: PaginatedResponse<AccountLedgerRowResponse>;
};

export type AccountBalanceTypeOptionResponse = { filterCode: string; title: string };

export type AccountBalanceRowResponse = {
  accountId: string | null;
  customerId: string | null;
  vendorId: string | null;
  staffId: string | null;
  code: string;
  title: string;
  typeTitle: string;
  debitAmount: number;
  creditAmount: number;
};

export type AccountBalanceReportResponse = {
  asOfDate: string;
  storeId: string | null;
  accountTypeFilter: string;
  amountTypeFilter: string;
  rows: AccountBalanceRowResponse[];
  totalDebitAmount: number;
  totalCreditAmount: number;
};

export const TrialBalanceRowKindCodes = { group: "GROUP", account: "ACCOUNT" } as const;
export type TrialBalanceRowKindCode = (typeof TrialBalanceRowKindCodes)[keyof typeof TrialBalanceRowKindCodes];

export type TrialBalanceRowResponse = {
  rowKindCode: TrialBalanceRowKindCode;
  groupCode: string;
  groupTitle: string;
  accountId: string | null;
  accountCode: string | null;
  accountTitle: string | null;
  mainTypeCode: string;
  totalDebitAmount: number;
  totalCreditAmount: number;
  balanceDebitAmount: number;
  balanceCreditAmount: number;
};

export type TrialBalanceResponse = {
  asOfDate: string;
  storeId: string | null;
  isDetailed: boolean;
  rows: TrialBalanceRowResponse[];
  totalDebitAmount: number;
  totalCreditAmount: number;
  totalBalanceDebitAmount: number;
  totalBalanceCreditAmount: number;
  isBalanced: boolean;
};

export type GeneralJournalRowResponse = {
  entryId: string;
  entryDate: string;
  lineNumber: number;
  storeId: string;
  storeName: string;
  accountCode: string;
  accountTitle: string;
  contactName: string | null;
  typeCode: string;
  voucherNumber: number | null;
  description: string | null;
  debitAmount: number;
  creditAmount: number;
};

export type GeneralJournalResponse = {
  fromDate: string;
  toDate: string;
  storeId: string | null;
  typeCode: string | null;
  totalDebitAmount: number;
  totalCreditAmount: number;
  lines: PaginatedResponse<GeneralJournalRowResponse>;
};

export type AccountingPeriodResponse = {
  periodStart: string;
  statusCode: "OPEN" | "CLOSED";
  closedAt: string | null;
  closedByName: string | null;
};

export type ChangeAccountingPeriodRequest = { periodStart: string };

export type CashAndBankAccountBalanceResponse = {
  accountId: string;
  accountCode: string;
  accountTitle: string;
  kindCode: "CASH" | "BANK";
  storeId: string;
  storeName: string;
  balanceAmount: number;
  balanceSideCode: BalanceSideCode;
};

export type CashAndBankBalancesResponse = {
  asOfDate: string;
  storeId: string | null;
  accounts: CashAndBankAccountBalanceResponse[];
  totalCashAmount: number;
  totalBankAmount: number;
};
