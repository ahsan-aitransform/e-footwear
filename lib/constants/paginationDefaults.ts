// SINGLE SOURCE OF TRUTH FOR LIST PAGING AND SEARCH DEFAULTS. The API binds a list request from
// ?pageNumber=&pageSize=&sortField=&sortDirection=&searchText= (backend PageRequest) and answers with
// { items, pageNumber, pageSize, totalItemCount } (backend PagedResult). The screens work with the app-facing
// PaginatedResponse of lib/types/pagination.ts; lib/api/normalisePagedResponse.ts converts the answer.

export const DEFAULT_PAGE_NUMBER = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAXIMUM_PAGE_SIZE = 200;
export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50, 100];

// Wait this long after the last keystroke before a search is sent to the server.
export const SEARCH_INPUT_DEBOUNCE_MILLISECONDS = 300;

export const QueryStringParameterNames = {
  page: "pageNumber",
  pageSize: "pageSize",
  sortField: "sortField",
  sortDirection: "sortDirection",
  search: "searchText",
} as const;

// The values of the sortDirection parameter (backend enum SortDirection).
export const SortDirectionParameterValues = {
  ascending: "Ascending",
  descending: "Descending",
} as const;
