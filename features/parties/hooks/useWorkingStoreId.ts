"use client";

import { useSyncExternalStore } from "react";
import {
  getSelectedStoreIdSnapshot,
  getServerSelectedStoreIdSnapshot,
  subscribeToSelectedStore,
} from "@/lib/session/selectedStoreStore";
import { useCurrentSession } from "@/lib/session/useSessionState";

// The store a store-bound screen (cash count, promise, opening balance) works in: the one chosen in the top bar, or the
// person's only store. Null when they work in several stores and have not chosen one yet; the screen then asks them to.
export function useWorkingStoreId(): string | null {
  const session = useCurrentSession();
  const selectedStoreId = useSyncExternalStore(
    subscribeToSelectedStore,
    getSelectedStoreIdSnapshot,
    getServerSelectedStoreIdSnapshot,
  );
  if (selectedStoreId) return selectedStoreId;
  if (session?.audience === "COMPANY_USER" && !session.hasAccessToAllStores && session.accessibleStoreIds.length === 1) {
    return session.accessibleStoreIds[0];
  }
  return null;
}
