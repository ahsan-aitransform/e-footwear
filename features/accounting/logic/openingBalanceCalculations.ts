import { sumWholeRupees } from "@/lib/money/wholeRupeeAmount";
import type { OpeningBalanceLineRequest, OpeningBalanceRowResponse } from "../types/chartOfAccountsTypes";

// One row of the editable opening balance grid: the loaded row plus the typed amounts (whole rupees, null = empty).
export type OpeningBalanceEditableRow = {
  rowKey: string;
  accountId: string | null;
  partyId: string | null;
  code: string;
  name: string;
  areaName: string | null;
  debitAmount: number | null;
  creditAmount: number | null;
};

export type OpeningBalanceTotals = { totalDebitAmount: number; totalCreditAmount: number; differenceAmount: number };

export function toEditableRows(rows: readonly OpeningBalanceRowResponse[]): OpeningBalanceEditableRow[] {
  return rows.map((row) => ({
    rowKey: row.partyId ? `party-${row.partyId}` : `account-${row.accountId}`,
    accountId: row.accountId,
    partyId: row.partyId,
    code: row.code,
    name: row.name,
    areaName: row.areaName,
    debitAmount: row.debitAmount === 0 ? null : row.debitAmount,
    creditAmount: row.creditAmount === 0 ? null : row.creditAmount,
  }));
}

// The footer of the grid: total debit, total credit and their difference. The books are balanced when the difference is 0
// (the server posts the other side to the opening equity account, so a difference is a warning, not an error).
export function calculateOpeningBalanceTotals(rows: readonly OpeningBalanceEditableRow[]): OpeningBalanceTotals {
  const totalDebitAmount = sumWholeRupees(rows.map((row) => row.debitAmount ?? 0));
  const totalCreditAmount = sumWholeRupees(rows.map((row) => row.creditAmount ?? 0));
  return { totalDebitAmount, totalCreditAmount, differenceAmount: totalDebitAmount - totalCreditAmount };
}

// A row has one side only: typing a debit clears the credit and the other way round.
export function setRowAmount(
  row: OpeningBalanceEditableRow,
  side: "debit" | "credit",
  amount: number | null,
): OpeningBalanceEditableRow {
  if (side === "debit") return { ...row, debitAmount: amount, creditAmount: amount ? null : row.creditAmount };
  return { ...row, creditAmount: amount, debitAmount: amount ? null : row.debitAmount };
}

// Every row of the sheet is sent: an emptied row tells the server to clear that opening balance (reversal), a row
// whose amounts did not change is left alone by the server.
export function toSaveLines(rows: readonly OpeningBalanceEditableRow[]): OpeningBalanceLineRequest[] {
  return rows.map((row) => ({
    accountId: row.accountId,
    partyId: row.partyId,
    debitAmount: row.debitAmount ?? 0,
    creditAmount: row.creditAmount ?? 0,
  }));
}
