"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePaginatedQuery } from "@/lib/api/hooks/usePaginatedQuery";
import type { QueryStringParameters } from "@/lib/api/queryString";
import {
  DEFAULT_PAGE_NUMBER,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  SEARCH_INPUT_DEBOUNCE_MILLISECONDS,
} from "@/lib/constants/paginationDefaults";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { PageRequest, SortState } from "@/lib/types/pagination";
import { DataGridTable, type DataGridSelection } from "./DataGridTable";
import type { DataGridColumn } from "./dataGridTypes";

export type ServerPaginatedDataGridProps<TRow> = {
  // The list endpoint, for example ApiEndpoints.users.list. It must answer { items, page, pageSize, totalCount }.
  path: string;
  columns: readonly DataGridColumn<TRow>[];
  getRowKey: (row: TRow) => string;
  caption: string;
  emptyTitle: string;
  emptyText?: string;
  // Extra filters of the screen (store, date range, status ...). Changing them goes back to page 1.
  filters?: QueryStringParameters;
  defaultSort?: SortState;
  initialPageSize?: number;
  isSearchEnabled?: boolean;
  searchPlaceholder?: string;
  onRowOpen?: (row: TRow) => void;
  isSelectionEnabled?: boolean;
  onSelectedRowKeysChange?: (selectedRowKeys: ReadonlySet<string>) => void;
  // Totals of the rows on this page (amount columns). The returned cells are matched to columns by column key.
  buildTotalsRow?: (rows: readonly TRow[], totalCount: number) => Record<string, ReactNode>;
  // Buttons shown next to the search box (New, Export, ...).
  toolbarActions?: ReactNode;
  // Keeps the last answer on the device so the list still opens offline.
  offlineCacheName?: string;
};

// A list screen in one component: search box, sortable columns, server paging, totals row, selection, double-click to
// open, loading/empty/error states, and the saved copy when offline. The server does the sorting, searching and paging.
export function ServerPaginatedDataGrid<TRow>({
  path,
  columns,
  getRowKey,
  caption,
  emptyTitle,
  emptyText,
  filters,
  defaultSort,
  initialPageSize = DEFAULT_PAGE_SIZE,
  isSearchEnabled = true,
  searchPlaceholder,
  onRowOpen,
  isSelectionEnabled = false,
  onSelectedRowKeysChange,
  buildTotalsRow,
  toolbarActions,
  offlineCacheName,
}: ServerPaginatedDataGridProps<TRow>) {
  const { translateMessage } = useTranslation();
  const [page, setPage] = useState(DEFAULT_PAGE_NUMBER);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState<SortState | undefined>(defaultSort);
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<ReadonlySet<string>>(new Set());

  // Wait for a pause in typing before asking the server.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(searchText);
      setPage(DEFAULT_PAGE_NUMBER);
    }, SEARCH_INPUT_DEBOUNCE_MILLISECONDS);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const pageRequest = useMemo<PageRequest>(
    () => ({ page, pageSize, sort, search: appliedSearch }),
    [page, pageSize, sort, appliedSearch],
  );

  const state = usePaginatedQuery<TRow>(path, { pageRequest, filters, offlineCacheName });

  const totalsCells = buildTotalsRow ? buildTotalsRow(state.items, state.totalCount) : undefined;
  const columnsWithTotals = useMemo(
    () => (totalsCells ? columns.map((column) => ({ ...column, totalCell: totalsCells[column.key] })) : columns),
    [columns, totalsCells],
  );

  const selection: DataGridSelection | undefined = isSelectionEnabled
    ? {
        selectedRowKeys,
        onSelectedRowKeysChange: (next) => {
          setSelectedRowKeys(next);
          onSelectedRowKeysChange?.(next);
        },
      }
    : undefined;

  const hasSearch = appliedSearch.trim() !== "";
  const savedAtText = state.savedAtIsoTimestamp ? new Date(state.savedAtIsoTimestamp).toLocaleString() : "";

  return (
    <div className="space-y-3">
      {(isSearchEnabled || toolbarActions) && (
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 sm:px-6">
          {isSearchEnabled && (
            <Input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={searchPlaceholder ?? translateMessage("dataGrid.searchPlaceholder")}
              aria-label={translateMessage("common.search")}
              className="max-w-xs"
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={state.refetch}
            aria-label={translateMessage("dataGrid.refresh")}
            disabled={state.isRefreshing}
          >
            <RefreshCw className={state.isRefreshing ? "animate-spin" : undefined} />
          </Button>
          <div className="ms-auto flex items-center gap-2">{toolbarActions}</div>
        </div>
      )}

      {state.source === "cache" && (
        <div className="px-5 sm:px-6">
          <InlineNotice tone={ToneNames.warning}>
            {translateMessage("dataGrid.savedDataNotice", { savedAt: savedAtText })}
          </InlineNotice>
        </div>
      )}

      <DataGridTable
        rows={state.items}
        columns={columnsWithTotals}
        getRowKey={getRowKey}
        caption={caption}
        sort={sort}
        onSortChange={(nextSort) => {
          setSort(nextSort);
          setPage(DEFAULT_PAGE_NUMBER);
        }}
        isLoading={state.status === "loading"}
        errorMessage={state.status === "error" ? (state.problem?.message ?? translateMessage("dataGrid.loadFailed")) : undefined}
        emptyTitle={hasSearch ? translateMessage("dataGrid.noRowsMatchingSearch") : emptyTitle}
        emptyText={hasSearch ? undefined : emptyText}
        onRowOpen={onRowOpen}
        selection={selection}
        showTotalsRow={totalsCells !== undefined}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-sm text-muted-foreground sm:px-6">
        <span>
          {translateMessage("dataGrid.totalCount", { count: state.totalCount })}
          {selectedRowKeys.size > 0 && ` · ${translateMessage("dataGrid.selectedCount", { count: selectedRowKeys.size })}`}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            <span>{translateMessage("dataGrid.rowsPerPage")}</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(DEFAULT_PAGE_NUMBER);
              }}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= DEFAULT_PAGE_NUMBER}
            onClick={() => setPage((current) => Math.max(DEFAULT_PAGE_NUMBER, current - 1))}
          >
            {translateMessage("dataGrid.previousPage")}
          </Button>
          <span>{translateMessage("dataGrid.pageStatus", { page, pageCount: state.pageCount })}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= state.pageCount}
            onClick={() => setPage((current) => Math.min(state.pageCount, current + 1))}
          >
            {translateMessage("dataGrid.nextPage")}
          </Button>
        </div>
      </div>
    </div>
  );
}
