"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/apiRequest";
import { normalisePagedResponse, type ApiPagedResponse } from "@/lib/api/normalisePagedResponse";
import { QueryStringParameterNames } from "@/lib/constants/paginationDefaults";
import type { ApiProblem } from "@/lib/types/apiProblem";

export type PostPreviewState<TRow> = {
  status: "idle" | "loading" | "success" | "error";
  items: TRow[];
  totalCount: number;
  problem: ApiProblem | undefined;
  refetch: () => void;
};

// A paged answer to a POST (the bulk-change previews send their filter as the body and the page as the query string).
// Nothing is requested while `body` is null (the filter is not complete yet).
export function usePostPreviewPage<TRow>(path: string, body: object | null, page: number, pageSize: number): PostPreviewState<TRow> {
  const requestKey = body === null ? null : JSON.stringify({ path, body, page, pageSize });
  const [reloadId, setReloadId] = useState(0);
  const [stored, setStored] = useState<{ key: string; reloadId: number; items: TRow[]; totalCount: number; problem?: ApiProblem }>();

  useEffect(() => {
    if (requestKey === null) return;
    const controller = new AbortController();
    const request = JSON.parse(requestKey) as { path: string; body: object; page: number; pageSize: number };
    apiRequest<ApiPagedResponse<TRow>>(request.path, {
      method: "POST",
      body: request.body,
      query: { [QueryStringParameterNames.page]: request.page, [QueryStringParameterNames.pageSize]: request.pageSize },
      signal: controller.signal,
    }).then((result) => {
      if (controller.signal.aborted || (!result.ok && result.kind === "aborted")) return;
      if (!result.ok) return setStored({ key: requestKey, reloadId, items: [], totalCount: 0, problem: result.problem });
      const paged = normalisePagedResponse(result.data);
      setStored({ key: requestKey, reloadId, items: paged?.items ?? [], totalCount: paged?.totalCount ?? 0 });
    });
    return () => controller.abort();
  }, [requestKey, reloadId]);

  const refetch = useCallback(() => setReloadId((current) => current + 1), []);

  if (requestKey === null) return { status: "idle", items: [], totalCount: 0, problem: undefined, refetch };
  const isCurrent = stored !== undefined && stored.key === requestKey && stored.reloadId === reloadId;
  if (!isCurrent) {
    // Keep the rows of the previous answer on screen while the next one loads.
    return { status: "loading", items: stored?.items ?? [], totalCount: stored?.totalCount ?? 0, problem: undefined, refetch };
  }
  return { status: stored.problem ? "error" : "success", items: stored.items, totalCount: stored.totalCount, problem: stored.problem, refetch };
}
