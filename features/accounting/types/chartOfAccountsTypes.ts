// Shapes of the chart of accounts and opening balance API (backend EFootwear.BLL/Accounting/Contracts). Money is whole rupees.

export type AccountMainTypeResponse = { code: string; digitPrefix: string; displayName: string };

export type AccountGroupResponse = {
  groupCode: string;
  mainTypeCode: string;
  name: string;
  accountCount: number;
  rowVersion: number;
};

export type AccountResponse = {
  id: string;
  code: string;
  groupCode: string;
  groupName: string;
  mainTypeCode: string;
  name: string;
  storeId: string;
  systemRole: string | null;
  isPostable: boolean;
  isPartyControl: boolean;
  isActive: boolean;
  rowVersion: number;
};

export type CreateAccountGroupRequest = { mainTypeCode: string; name: string };
export type UpdateAccountGroupRequest = { name: string; rowVersion: number };
export type CreateAccountRequest = { groupCode: string; name: string };
export type UpdateAccountRequest = { name: string; isActive: boolean; rowVersion: number };
export type NextAccountGroupCodeResponse = { groupCode: string };
export type NextAccountCodeResponse = { accountCode: string };

export type OpeningBalanceRowResponse = {
  accountId: string | null;
  partyId: string | null;
  code: string;
  name: string;
  areaName: string | null;
  debitAmount: number;
  creditAmount: number;
  entryDate: string | null;
};

export type OpeningBalanceSheetResponse = {
  storeId: string;
  rows: OpeningBalanceRowResponse[];
  totalDebitAmount: number;
  totalCreditAmount: number;
  differenceAmount: number;
};

export type OpeningBalanceLineRequest = {
  accountId: string | null;
  partyId: string | null;
  debitAmount: number;
  creditAmount: number;
};

export type SaveOpeningBalancesRequest = { storeId: string; entryDate: string; lines: OpeningBalanceLineRequest[] };
export type SaveOpeningBalancesResponse = { postedCount: number; unchangedCount: number; clearedCount: number };
