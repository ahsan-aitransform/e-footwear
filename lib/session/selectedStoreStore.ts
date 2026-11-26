// The store the signed-in person is working in, kept in localStorage and sent as the X-Store-Id header by the API client.
// The server checks the header against the person's store access; this is only the person's choice, not a permission.
// An external store (not React state) so the API client and any component read the same value.
import { LocalStorageKeys } from "@/lib/constants/browserStorageKeys";
import { HEAD_OFFICE_STORE_ID } from "@/lib/constants/headOfficeStore";
import type { CurrentSessionResponse } from "@/lib/types/session";

const listeners = new Set<() => void>();
let cachedSelectedStoreId: string | null | undefined;

function readStoredSelectedStoreId(): string | null {
  try {
    return window.localStorage.getItem(LocalStorageKeys.selectedStoreId) || null;
  } catch {
    return null;
  }
}

export function getSelectedStoreIdSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  if (cachedSelectedStoreId === undefined) cachedSelectedStoreId = readStoredSelectedStoreId();
  return cachedSelectedStoreId;
}

export function getServerSelectedStoreIdSnapshot(): string | null {
  return null;
}

export function subscribeToSelectedStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSelectedStoreId(storeId: string | null): void {
  cachedSelectedStoreId = storeId;
  try {
    if (storeId) window.localStorage.setItem(LocalStorageKeys.selectedStoreId, storeId);
    else window.localStorage.removeItem(LocalStorageKeys.selectedStoreId);
  } catch {
    // storage unavailable: the choice lasts until the page closes
  }
  listeners.forEach((listener) => listener());
}

// Keeps the choice valid for the person who is signed in:
//  - a store the person cannot access is forgotten;
//  - a person with exactly one accessible store works in that store.
export function reconcileSelectedStoreWithSession(session: CurrentSessionResponse): void {
  if (session.audience !== "COMPANY_USER") {
    if (getSelectedStoreIdSnapshot() !== null) setSelectedStoreId(null);
    return;
  }
  const selected = getSelectedStoreIdSnapshot();
  const isNotAccessible = !session.hasAccessToAllStores && !session.accessibleStoreIds.includes(selected ?? "");
  if (selected && (selected === HEAD_OFFICE_STORE_ID || isNotAccessible)) {
    setSelectedStoreId(null);
  }
  if (!getSelectedStoreIdSnapshot() && !session.hasAccessToAllStores && session.accessibleStoreIds.length === 1) {
    setSelectedStoreId(session.accessibleStoreIds[0]);
  }
}

// Test helper.
export function resetSelectedStoreStoreForTests(): void {
  cachedSelectedStoreId = undefined;
}
