"use client";

import { useMemo } from "react";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import type { StoreSummaryResponse } from "@/lib/types/store";

// The active stores the signed-in person may work in, without the head office (settings per store and numbering exist
// only for stores that sell).
export function useSellingStores() {
  const stores = useApiQuery<StoreSummaryResponse[]>(ApiEndpoints.stores.listAccessibleStores);
  const sellingStores = useMemo(
    () => (stores.data ?? []).filter((store) => !store.isHeadOffice && store.isActive),
    [stores.data],
  );
  return { sellingStores, status: stores.status, problem: stores.problem };
}
