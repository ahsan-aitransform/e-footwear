"use client";

import { useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { Button } from "@/components/ui/button";
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE } from "@/lib/constants/paginationDefaults";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePostPreviewPage } from "../hooks/usePostPreviewPage";

// The "these rows will change" table of the bulk screens: a page of the preview answer of a POST endpoint. Nothing is
// requested while the filter (body) is null. When the totals are known, the parent is told through onTotalCountChange.
export function PostPreviewGrid<TRow>({
  path,
  body,
  columns,
  getRowKey,
  caption,
  emptyTitle,
  emptyText,
  idleText,
  refreshKey = 0,
}: {
  path: string;
  body: object | null;
  columns: readonly DataGridColumn<TRow>[];
  getRowKey: (row: TRow) => string;
  caption: string;
  emptyTitle: string;
  emptyText?: string;
  // Shown instead of the table while the filter is incomplete.
  idleText: string;
  // Changing it asks for the rows again (after a change was applied).
  refreshKey?: number;
}) {
  const { translateMessage } = useTranslation();
  const [page, setPage] = useState(DEFAULT_PAGE_NUMBER);
  const [filterKey, setFilterKey] = useState<string | null>(null);
  const currentFilterKey = body === null ? null : JSON.stringify({ body, refreshKey });
  // A new filter goes back to page 1 (adjusting state while rendering, not in an effect).
  if (currentFilterKey !== filterKey) {
    setFilterKey(currentFilterKey);
    setPage(DEFAULT_PAGE_NUMBER);
  }

  const state = usePostPreviewPage<TRow>(path, body === null ? null : { ...body }, page, DEFAULT_PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(state.totalCount / DEFAULT_PAGE_SIZE));

  if (body === null) return <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">{idleText}</p>;

  return (
    <div className="space-y-3">
      <DataGridTable
        rows={state.items}
        columns={columns}
        getRowKey={getRowKey}
        caption={caption}
        isLoading={state.status === "loading" && state.items.length === 0}
        errorMessage={state.status === "error" ? (state.problem?.message ?? translateMessage("dataGrid.loadFailed")) : undefined}
        emptyTitle={emptyTitle}
        emptyText={emptyText}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-sm text-muted-foreground sm:px-6">
        <span>{translateMessage("dataGrid.totalCount", { count: state.totalCount })}</span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= DEFAULT_PAGE_NUMBER} onClick={() => setPage((current) => Math.max(DEFAULT_PAGE_NUMBER, current - 1))}>
            {translateMessage("dataGrid.previousPage")}
          </Button>
          <span>{translateMessage("dataGrid.pageStatus", { page, pageCount })}</span>
          <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
            {translateMessage("dataGrid.nextPage")}
          </Button>
        </div>
      </div>
    </div>
  );
}
