"use client";

import { useMemo } from "react";
import type { PageRequest, PaginatedResponse } from "@/lib/types/pagination";
import { normalisePagedResponse, type ApiPagedResponse } from "../normalisePagedResponse";
import { pageRequestToQueryParameters, type QueryStringParameters } from "../queryString";
import { useApiQuery, type ApiQueryState } from "./useApiQuery";

export type PaginatedQueryOptions = {
  pageRequest: PageRequest;
  // Extra filters of the screen (store, date range, status ...), sent as query parameters next to the paging ones.
  filters?: QueryStringParameters;
  enabled?: boolean;
  offlineCacheName?: string;
};

export type PaginatedQueryState<TItem> = Omit<ApiQueryState<PaginatedResponse<TItem>>, "data"> & {
  items: TItem[];
  totalCount: number;
  pageCount: number;
};

export function usePaginatedQuery<TItem>(path: string | null, options: PaginatedQueryOptions): PaginatedQueryState<TItem> {
  const { pageRequest, filters, enabled, offlineCacheName } = options;
  const query = useMemo(
    () => ({ ...filters, ...pageRequestToQueryParameters(pageRequest) }),
    [filters, pageRequest],
  );
  const state = useApiQuery<ApiPagedResponse<TItem>>(path, { query, enabled, offlineCacheName });

  const data = useMemo(() => normalisePagedResponse(state.data), [state.data]);
  const totalCount = data?.totalCount ?? 0;
  const pageSize = data?.pageSize ?? pageRequest.pageSize;
  const { data: _rawResponse, ...stateWithoutData } = state;
  void _rawResponse;
  return {
    ...stateWithoutData,
    items: data?.items ?? [],
    totalCount,
    pageCount: Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize))),
  };
}
