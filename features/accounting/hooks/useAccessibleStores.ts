"use client";

import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useCurrentSession } from "@/lib/session/useSessionState";
import type { StoreSummaryResponse } from "@/lib/types/store";

// The stores the signed-in person may work in, and whether they may also look at every store together ("All stores").
// The server decides what is allowed; this only fills the dropdowns.
export function useAccessibleStores(): {
  stores: readonly StoreSummaryResponse[];
  mayChooseAllStores: boolean;
  isLoading: boolean;
} {
  const session = useCurrentSession();
  const query = useApiQuery<StoreSummaryResponse[]>(ApiEndpoints.stores.listAccessibleStores);
  return {
    stores: query.data ?? [],
    mayChooseAllStores: session?.audience === "COMPANY_USER" && session.hasAccessToAllStores,
    isLoading: query.status === "loading",
  };
}
