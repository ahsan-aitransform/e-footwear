import { QueryStringParameterNames, SortDirectionParameterValues } from "@/lib/constants/paginationDefaults";
import type { PageRequest } from "@/lib/types/pagination";

export type QueryStringValue = string | number | boolean | null | undefined | ReadonlyArray<string | number>;
export type QueryStringParameters = Record<string, QueryStringValue>;

// { page: 2, search: "", ids: [1, 2] } -> "?page=2&ids=1&ids=2". Empty, null and undefined values are left out.
export function buildQueryString(parameters: QueryStringParameters | undefined): string {
  if (!parameters) return "";
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(parameters)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(name, String(item));
    } else {
      search.append(name, String(value));
    }
  }
  const text = search.toString();
  return text.length > 0 ? `?${text}` : "";
}

// The API sorts by ?sortField=<column>&sortDirection=Ascending|Descending. Nothing is sent when there is no sort.
export function formatSortParameters(sort: PageRequest["sort"]): QueryStringParameters {
  if (!sort) return {};
  return {
    [QueryStringParameterNames.sortField]: sort.columnKey,
    [QueryStringParameterNames.sortDirection]:
      sort.direction === "descending" ? SortDirectionParameterValues.descending : SortDirectionParameterValues.ascending,
  };
}

export function pageRequestToQueryParameters(pageRequest: PageRequest): QueryStringParameters {
  return {
    [QueryStringParameterNames.page]: pageRequest.page,
    [QueryStringParameterNames.pageSize]: pageRequest.pageSize,
    ...formatSortParameters(pageRequest.sort),
    [QueryStringParameterNames.search]: pageRequest.search?.trim() || undefined,
  };
}
