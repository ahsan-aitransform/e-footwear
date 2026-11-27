import { describe, expect, it } from "vitest";
import { HEAD_OFFICE_STORE_ID } from "@/lib/constants/headOfficeStore";
import { accountsOfSellingStore } from "./storePaymentAccounts";

const account = (accountId: string, kindCode: "CASH" | "BANK", storeId: string) =>({ accountId, code: accountId, title: accountId, kindCode, storeId });
const accounts = [
  account("head-cash", "CASH", HEAD_OFFICE_STORE_ID),
  account("main-cash", "CASH", "main"),
  account("second-cash", "CASH", "second"),
  account("head-bank", "BANK", HEAD_OFFICE_STORE_ID),
];

describe("accountsOfSellingStore", () => {
  it("offers the store's own cash and the head office bank, never another store's account", () => {
    expect(accountsOfSellingStore(accounts, "second").map((one) => one.accountId)).toEqual(["second-cash", "head-bank"]);
  });

  it("falls back to the head office for a store without its own account", () => {
    expect(accountsOfSellingStore(accounts, "new-store").map((one) => one.accountId)).toEqual(["head-cash", "head-bank"]);
  });
});
