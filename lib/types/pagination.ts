// Lists are requested with ?page=&pageSize=&sort=&search= and answered with PaginatedResponse.
export type SortDirection = "ascending" | "descending";

export type SortState = {
  columnKey: string;
  direction: SortDirection;
};

export type PageRequest = {
  page: number;
  pageSize: number;
  sort?: SortState;
  search?: string;
};

export type PaginatedResponse<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};
