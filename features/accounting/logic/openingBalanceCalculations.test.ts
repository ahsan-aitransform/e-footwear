import { describe, expect, it } from "vitest";
import {
  calculateOpeningBalanceTotals,
  setRowAmount,
  toEditableRows,
  toSaveLines,
} from "./openingBalanceCalculations";

const loadedRows = [
  { accountId: "a1", customerId: null, vendorId: null, staffId: null, code: "101", name: "Cash", areaName: null, debitAmount: 5_000, creditAmount: 0, entryDate: "2026-01-01" },
  { accountId: null, customerId: "p1", vendorId: null, staffId: null, code: "10300001", name: "Ali", areaName: "Multan", debitAmount: 0, creditAmount: 2_000, entryDate: null },
];

describe("opening balance calculations", () => {
  it("turns loaded zero amounts into empty fields and keys customer and account rows apart", () => {
    const rows = toEditableRows(loadedRows);
    expect(rows.map((row) => row.rowKey)).toEqual(["account-a1", "customer-p1"]);
    expect(rows[0].creditAmount).toBeNull();
    expect(rows[1].debitAmount).toBeNull();
  });

  it("totals debit and credit and reports the difference", () => {
    const totals = calculateOpeningBalanceTotals(toEditableRows(loadedRows));
    expect(totals).toEqual({ totalDebitAmount: 5_000, totalCreditAmount: 2_000, differenceAmount: 3_000 });
  });

  it("keeps one side per row", () => {
    const [cashRow] = toEditableRows(loadedRows);
    const flipped = setRowAmount(cashRow, "credit", 700);
    expect(flipped.debitAmount).toBeNull();
    expect(flipped.creditAmount).toBe(700);
    const emptied = setRowAmount(flipped, "credit", null);
    expect(emptied.creditAmount).toBeNull();
  });

  it("sends every row, with 0 for an emptied side so the server can clear it", () => {
    const rows = toEditableRows(loadedRows);
    rows[0] = setRowAmount(rows[0], "debit", null);
    expect(toSaveLines(rows)).toEqual([
      { accountId: "a1", customerId: null, vendorId: null, staffId: null, debitAmount: 0, creditAmount: 0 },
      { accountId: null, customerId: "p1", vendorId: null, staffId: null, debitAmount: 0, creditAmount: 2_000 },
    ]);
  });
});
