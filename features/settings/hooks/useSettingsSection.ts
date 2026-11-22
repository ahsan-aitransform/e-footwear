"use client";

import { useState } from "react";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import type { SaveSettingsRequest } from "@/lib/types/settings";

// One settings section: loads it (GET) and saves it (PUT) with the row version that was loaded, so a change made by someone
// else in the meantime is refused by the server (409) instead of being overwritten. After a save the section is loaded again.
export function useSettingsSection<TValues, TDocument extends { rowVersion: number }>(path: string) {
  const query = useApiQuery<TDocument>(path);
  const mutation = useApiMutation<SaveSettingsRequest<TValues>, TDocument>(path, { method: "PUT" });
  const [wasSaved, setWasSaved] = useState(false);

  async function save(values: TValues): Promise<boolean> {
    setWasSaved(false);
    const result = await mutation.execute({ values, expectedRowVersion: query.data?.rowVersion ?? null });
    if (result.ok) {
      setWasSaved(true);
      query.refetch();
    }
    return result.ok;
  }

  return {
    document: query.data,
    status: query.status,
    loadProblem: query.problem,
    isOffline: query.isOffline,
    save,
    isSaving: mutation.isPending,
    saveProblem: mutation.problem,
    fieldErrorMessages: mutation.fieldErrorMessages,
    wasSaved,
    reload: query.refetch,
  };
}
