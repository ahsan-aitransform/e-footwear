// SINGLE SOURCE OF TRUTH FOR EVERY NAME USED IN BROWSER STORAGE (IndexedDB, localStorage, sessionStorage, caches).

export const INDEXED_DATABASE_NAME = "efootwear";
export const INDEXED_DATABASE_KEY_VALUE_STORE_NAME = "kv";

// Keys inside the IndexedDB key/value store.
export const IndexedDatabaseKeys = {
  storedSession: "session",
  permissionCatalogCache: "permissionCatalog",
  // Screen data cached per signed-in user, so screens still show something useful offline.
  offlineScreenData: (companyId: string, userId: string, cacheName: string) =>
    `offlineScreenData:${companyId}:${userId}:${cacheName}`,
  offlineScreenDataForPlatformAdministrator: (cacheName: string) => `offlineScreenData:platform:${cacheName}`,
  // The sale being typed (Part 23 offline readiness): kept per person and store until it is saved, so a reload or a lost connection loses nothing.
  salesEntryDraft: (companyId: string, userId: string, storeId: string, screenCode: string) =>
    `salesEntryDraft:${companyId}:${userId}:${storeId}:${screenCode}`,
  // <indexed-database-keys:end> (shared file: append above this marker, with Edit only)
} as const;

// Preferences that must survive a sign-out (language, theme) live in localStorage.
export const LocalStorageKeys = {
  languageCode: "efootwear.languageCode",
  themePreference: "efootwear.themePreference",
  selectedStoreId: "efootwear.selectedStoreId",
  // Sidebar: collapsed or not, and which menu groups the person opened or closed by hand (JSON).
  sidebarPreference: "efootwear.sidebarPreference",
  // <local-storage-keys:end> (shared file: append above this marker, with Edit only)
} as const;

// Short-lived values that must not survive closing the tab.
export const SessionStorageKeys = {
  pendingAccessNotice: "efootwear.pendingAccessNotice",
} as const;

export const SERVICE_WORKER_CACHE_NAME = "efw-shell-v1";
export const SERVICE_WORKER_SCRIPT_PATH = "/sw.js";
