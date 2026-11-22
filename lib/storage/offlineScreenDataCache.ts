// Screen data cached per signed-in person, so a screen still shows something useful when the server cannot be reached.
// A cache entry is only ever read back for the person who saved it (the key contains company and user).
import { IndexedDatabaseKeys } from "@/lib/constants/browserStorageKeys";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { readStoredValue, writeStoredValue } from "./indexedKeyValueStore";

export type CachedScreenData<TData> = {
  data: TData;
  savedAtIsoTimestamp: string;
};

export function offlineScreenDataKey(session: CurrentSessionResponse, cacheName: string): string {
  if (session.audience === "PLATFORM_ADMINISTRATOR") {
    return IndexedDatabaseKeys.offlineScreenDataForPlatformAdministrator(cacheName);
  }
  return IndexedDatabaseKeys.offlineScreenData(session.companyId ?? "", session.userId ?? "", cacheName);
}

export async function readOfflineScreenData<TData>(
  session: CurrentSessionResponse,
  cacheName: string,
): Promise<CachedScreenData<TData> | undefined> {
  return readStoredValue<CachedScreenData<TData>>(offlineScreenDataKey(session, cacheName));
}

export async function writeOfflineScreenData<TData>(
  session: CurrentSessionResponse,
  cacheName: string,
  data: TData,
): Promise<CachedScreenData<TData>> {
  const entry: CachedScreenData<TData> = { data, savedAtIsoTimestamp: new Date().toISOString() };
  await writeStoredValue(offlineScreenDataKey(session, cacheName), entry);
  return entry;
}
