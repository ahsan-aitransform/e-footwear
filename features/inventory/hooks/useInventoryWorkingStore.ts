"use client";

import { useAccessibleStores } from "@/features/accounting/hooks/useAccessibleStores";
import { useWorkingStoreId } from "@/lib/session/useWorkingStoreId";

// The store an inventory screen works in: the one chosen in the top bar (or the person's only store), with its name. The server checks the store again on
// every request; this only decides what the screen shows. storeId is null until a store has been chosen.
export function useInventoryWorkingStore(): { storeId: string | null; storeName: string } {
  const storeId = useWorkingStoreId();
  const { stores } = useAccessibleStores();
  const storeName = stores.find((store) => store.id === storeId)?.name ?? "";
  return { storeId, storeName };
}
