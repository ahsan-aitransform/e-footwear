"use client";

import { useCallback, useEffect, useState } from "react";
import { getSessionSnapshot, initializeSession } from "@/lib/session/sessionStore";
import { readOfflineScreenData, writeOfflineScreenData } from "@/lib/storage/offlineScreenDataCache";
import type { ApiProblem } from "@/lib/types/apiProblem";
import { apiRequest } from "../apiRequest";
import type { QueryStringParameters } from "../queryString";

export type ApiQueryOptions = {
  query?: QueryStringParameters;
  // false (or a null path) = do not request yet, for example while a required filter is empty.
  enabled?: boolean;
  // Keeps the last successful answer on the device (per signed-in person) under this name. When the server cannot
  // be reached the saved answer is shown instead, with source "cache", so the screen still works offline.
  offlineCacheName?: string;
};

export type ApiQueryState<TData> = {
  status: "loading" | "success" | "error";
  data: TData | undefined;
  problem: ApiProblem | undefined;
  // "cache" means the server could not be reached and the saved copy of savedAtIsoTimestamp is shown.
  source: "server" | "cache" | undefined;
  savedAtIsoTimestamp: string | undefined;
  isOffline: boolean;
  // true while a refetch of data that is already on screen is running.
  isRefreshing: boolean;
  refetch: () => void;
};

type QueryOutcome<TData> = {
  data?: TData;
  problem?: ApiProblem;
  source?: "server" | "cache";
  savedAtIsoTimestamp?: string;
  isOffline: boolean;
};

type StoredQueryResult<TData> = { requestKey: string; reloadId: number; outcome: QueryOutcome<TData> };

async function executeQuery<TData>(
  requestKey: string,
  signal: AbortSignal,
): Promise<QueryOutcome<TData> | "aborted"> {
  const request = JSON.parse(requestKey) as { path: string; query?: QueryStringParameters; offlineCacheName?: string };
  const result = await apiRequest<TData>(request.path, { query: request.query, signal });
  if (signal.aborted) return "aborted";

  await initializeSession();
  const sessionState = getSessionSnapshot();
  const currentSession = sessionState.phase === "authenticated" ? sessionState.storedSession.currentSession : null;

  if (result.ok) {
    let savedAtIsoTimestamp: string | undefined;
    if (request.offlineCacheName && currentSession) {
      const saved = await writeOfflineScreenData(currentSession, request.offlineCacheName, result.data);
      savedAtIsoTimestamp = saved.savedAtIsoTimestamp;
    }
    return { data: result.data, source: "server", savedAtIsoTimestamp, isOffline: false };
  }
  if (result.kind === "aborted") return "aborted";

  if (result.kind === "offline" && request.offlineCacheName && currentSession) {
    const cached = await readOfflineScreenData<TData>(currentSession, request.offlineCacheName);
    if (cached) {
      return { data: cached.data, source: "cache", savedAtIsoTimestamp: cached.savedAtIsoTimestamp, isOffline: true };
    }
  }
  return { problem: result.problem, isOffline: result.kind === "offline" };
}

// Loads data with a GET when the component mounts and whenever the path or query changes.
// State is only set from the promise callback, never synchronously inside the effect.
export function useApiQuery<TData>(path: string | null, options: ApiQueryOptions = {}): ApiQueryState<TData> {
  const enabled = options.enabled !== false && path !== null;
  const requestKey = JSON.stringify({ path, query: options.query, offlineCacheName: options.offlineCacheName });
  const [reloadId, setReloadId] = useState(0);
  const [stored, setStored] = useState<StoredQueryResult<TData>>();

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    executeQuery<TData>(requestKey, controller.signal).then((outcome) => {
      if (outcome === "aborted" || controller.signal.aborted) return;
      setStored({ requestKey, reloadId, outcome });
    });
    return () => controller.abort();
  }, [enabled, requestKey, reloadId]);

  const refetch = useCallback(() => setReloadId((current) => current + 1), []);

  const hasAnswerForThisRequest = stored !== undefined && stored.requestKey === requestKey;
  const outcome = hasAnswerForThisRequest ? stored.outcome : undefined;
  const status: ApiQueryState<TData>["status"] = !enabled || !outcome ? "loading" : outcome.problem ? "error" : "success";

  return {
    status,
    data: outcome?.data,
    problem: outcome?.problem,
    source: outcome?.source,
    savedAtIsoTimestamp: outcome?.savedAtIsoTimestamp,
    isOffline: outcome?.isOffline ?? false,
    isRefreshing: hasAnswerForThisRequest && stored.reloadId !== reloadId,
    refetch,
  };
}
