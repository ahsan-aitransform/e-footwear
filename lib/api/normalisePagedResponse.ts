import type { PaginatedResponse } from "@/lib/types/pagination";

// What the API sends for a list (backend PagedResult). A few older mocks and caches use the app-facing names, so both are accepted.
export type ApiPagedResponse<TItem> = {
  items: TItem[];
  pageNumber?: number;
  page?: number;
  pageSize: number;
  totalItemCount?: number;
  totalCount?: number;
};

// Converts the API's list answer to the shape the screens use: { items, page, pageSize, totalCount }.
export function normalisePagedResponse<TItem>(response: ApiPagedResponse<TItem> | undefined): PaginatedResponse<TItem> | undefined {
  if (!response) return undefined;
  return {
    items: response.items ?? [],
    page: response.pageNumber ?? response.page ?? 1,
    pageSize: response.pageSize,
    totalCount: response.totalItemCount ?? response.totalCount ?? 0,
  };
}
