import { HEAD_OFFICE_STORE_ID } from "@/lib/constants/headOfficeStore";
import { SalePaymentMethodCodes, type SalePaymentAccountResponse, type SalePaymentMethodCode } from "../types/saleTypes";

export function accountKindFor(methodCode: SalePaymentMethodCode): SalePaymentAccountResponse["kindCode"] {
  return methodCode === SalePaymentMethodCodes.cash ? "CASH" : "BANK";
}

// A sale's money is booked in the store that sells: its own accounts of each kind, and the head office's only for a kind the store has
// no account of (the bank). Another store's account is never offered.
export function accountsOfSellingStore(accounts: readonly SalePaymentAccountResponse[], storeId: string): SalePaymentAccountResponse[] {
  const kinds = [...new Set(accounts.map((account) => account.kindCode))];
  return kinds.flatMap((kind) => {
    const ofKind = accounts.filter((account) => account.kindCode === kind);
    const ofStore = ofKind.filter((account) => account.storeId === storeId);
    return ofStore.length > 0 ? ofStore : ofKind.filter((account) => account.storeId === HEAD_OFFICE_STORE_ID);
  });
}
