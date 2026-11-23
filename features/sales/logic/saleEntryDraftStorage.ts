// Offline readiness of the sale screens (Part 23). The full outbox is built later; what is guaranteed now is: the sale being typed is kept in the browser
// (IndexedDB) per person, store and screen until the server has confirmed it, the same client transaction id is reused for every retry (so a lost answer
// can never post twice), and the screen says clearly that the entry is NOT saved yet.
import { IndexedDatabaseKeys } from "@/lib/constants/browserStorageKeys";
import { deleteStoredValue, readStoredValue, writeStoredValue } from "@/lib/storage/indexedKeyValueStore";

export const SalesDraftScreenCodes = { newSale: "newSale", saleReturn: "saleReturn", exchange: "exchange" } as const;
export type SalesDraftScreenCode = (typeof SalesDraftScreenCodes)[keyof typeof SalesDraftScreenCodes];

const DRAFT_FORMAT_VERSION = 1;

export type StoredSalesDraft<TDraft> = {
  formatVersion: number;
  savedAtIso: string;
  draft: TDraft;
};

export async function saveSalesDraft<TDraft>(
  identity: { companyId: string; userId: string; storeId: string; screenCode: SalesDraftScreenCode },
  draft: TDraft,
): Promise<void> {
  const stored: StoredSalesDraft<TDraft> = { formatVersion: DRAFT_FORMAT_VERSION, savedAtIso: new Date().toISOString(), draft };
  await writeStoredValue(IndexedDatabaseKeys.salesEntryDraft(identity.companyId, identity.userId, identity.storeId, identity.screenCode), stored);
}

export async function loadSalesDraft<TDraft>(identity: {
  companyId: string;
  userId: string;
  storeId: string;
  screenCode: SalesDraftScreenCode;
}): Promise<TDraft | undefined> {
  const stored = await readStoredValue<StoredSalesDraft<TDraft>>(
    IndexedDatabaseKeys.salesEntryDraft(identity.companyId, identity.userId, identity.storeId, identity.screenCode),
  );
  // A draft written by another version of the screen is not trusted.
  return stored && stored.formatVersion === DRAFT_FORMAT_VERSION ? stored.draft : undefined;
}

export async function discardSalesDraft(identity: { companyId: string; userId: string; storeId: string; screenCode: SalesDraftScreenCode }): Promise<void> {
  await deleteStoredValue(IndexedDatabaseKeys.salesEntryDraft(identity.companyId, identity.userId, identity.storeId, identity.screenCode));
}
