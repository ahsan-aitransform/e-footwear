"use client";

import { useId, useSyncExternalStore } from "react";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  getSelectedStoreIdSnapshot,
  getServerSelectedStoreIdSnapshot,
  setSelectedStoreId,
  subscribeToSelectedStore,
} from "@/lib/session/selectedStoreStore";
import { useCurrentSession } from "@/lib/session/useSessionState";
import type { StoreSummaryResponse } from "@/lib/types/store";

const STORE_SELECTOR_CACHE_NAME = "storeSelector";

// Lets a company user who works in several stores pick the one the screens are about. The choice is sent as the
// X-Store-Id header by the API client; the server checks it against the person's store access.
// Hidden for people with a single store (they work in it automatically) and for platform administrators.
export function StoreSelector() {
  const session = useCurrentSession();
  const { translateMessage } = useTranslation();
  const selectId = useId();
  const selectedStoreId = useSyncExternalStore(
    subscribeToSelectedStore,
    getSelectedStoreIdSnapshot,
    getServerSelectedStoreIdSnapshot,
  );

  const isCompanyUserWithSeveralStores =
    session?.audience === "COMPANY_USER" && (session.hasAccessToAllStores || session.accessibleStoreIds.length > 1);
  const stores = useApiQuery<StoreSummaryResponse[]>(ApiEndpoints.stores.listAccessibleStores, {
    enabled: isCompanyUserWithSeveralStores,
    offlineCacheName: STORE_SELECTOR_CACHE_NAME,
  });

  const selectableStores = (stores.data ?? []).filter((store) => store.isActive);
  if (!isCompanyUserWithSeveralStores || selectableStores.length < 2) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="sr-only">
        {translateMessage("shell.storeSelectorLabel")}
      </label>
      <select
        id={selectId}
        value={selectedStoreId ?? ""}
        onChange={(event) => setSelectedStoreId(event.target.value || null)}
        className="h-8 max-w-48 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
      >
        <option value="">{translateMessage("shell.allStoresOption")}</option>
        {selectableStores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.code} · {store.name}
          </option>
        ))}
      </select>
    </div>
  );
}
