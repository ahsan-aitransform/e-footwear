"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { TableSkeleton } from "@/components/feedback/Skeletons";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { SortState } from "@/lib/types/pagination";
import { cn } from "@/lib/utils";
import type { DataGridColumn, DataGridColumnAlignment } from "./dataGridTypes";

const alignmentClassNames: Record<DataGridColumnAlignment, string> = {
  start: "text-start",
  center: "text-center",
  end: "text-end tabular-nums",
};

export type DataGridSelection = {
  selectedRowKeys: ReadonlySet<string>;
  onSelectedRowKeysChange: (selectedRowKeys: ReadonlySet<string>) => void;
};

export type DataGridTableProps<TRow> = {
  rows: readonly TRow[];
  columns: readonly DataGridColumn<TRow>[];
  getRowKey: (row: TRow) => string;
  // The accessible name of the table.
  caption: string;
  sort?: SortState;
  onSortChange?: (sort: SortState | undefined) => void;
  isLoading?: boolean;
  errorMessage?: string;
  emptyTitle: string;
  emptyText?: string;
  // Double-click or Enter on a row.
  onRowOpen?: (row: TRow) => void;
  selection?: DataGridSelection;
  // A totals row at the bottom, built from each column's totalCell.
  showTotalsRow?: boolean;
  totalsRowLabel?: string;
  skeletonRowCount?: number;
};

// The table of every list screen. Presentational: it shows the rows it is given. Sorting and selection are controlled by the
// parent, so the same table serves server-paginated lists (ServerPaginatedDataGrid) and small client-side lists.
// Keyboard: Arrow Up/Down, Home and End move between rows; Enter opens the row; Space toggles its selection.
// Loading, empty and error states are built in.
export function DataGridTable<TRow>({
  rows,
  columns,
  getRowKey,
  caption,
  sort,
  onSortChange,
  isLoading = false,
  errorMessage,
  emptyTitle,
  emptyText,
  onRowOpen,
  selection,
  showTotalsRow = false,
  totalsRowLabel,
  skeletonRowCount = 5,
}: DataGridTableProps<TRow>) {
  const { translateMessage } = useTranslation();
  const bodyReference = useRef<HTMLTableSectionElement>(null);
  const [activeRowIndex, setActiveRowIndex] = useState(0);

  if (errorMessage) return <div className="p-5"><InlineNotice>{errorMessage}</InlineNotice></div>;
  if (isLoading) return <TableSkeleton rowCount={skeletonRowCount} columnCount={Math.max(columns.length, 2)} />;
  if (rows.length === 0) return <EmptyState title={emptyTitle} text={emptyText} />;

  const selectedRowKeys = selection?.selectedRowKeys;
  const allRowsAreSelected = selectedRowKeys !== undefined && rows.every((row) => selectedRowKeys.has(getRowKey(row)));

  function toggleSort(columnKey: string) {
    if (!onSortChange) return;
    if (sort?.columnKey !== columnKey) onSortChange({ columnKey, direction: "ascending" });
    else if (sort.direction === "ascending") onSortChange({ columnKey, direction: "descending" });
    else onSortChange(undefined);
  }

  function toggleRowSelection(rowKey: string) {
    if (!selection) return;
    const next = new Set(selection.selectedRowKeys);
    if (next.has(rowKey)) next.delete(rowKey);
    else next.add(rowKey);
    selection.onSelectedRowKeysChange(next);
  }

  function toggleAllRowSelection(shouldSelect: boolean) {
    if (!selection) return;
    const next = new Set(selection.selectedRowKeys);
    for (const row of rows) {
      if (shouldSelect) next.add(getRowKey(row));
      else next.delete(getRowKey(row));
    }
    selection.onSelectedRowKeysChange(next);
  }

  function focusRow(index: number) {
    const clamped = Math.min(Math.max(index, 0), rows.length - 1);
    setActiveRowIndex(clamped);
    bodyReference.current?.querySelectorAll<HTMLElement>("tr[data-row-index]")[clamped]?.focus();
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: TRow, index: number) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusRow(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusRow(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusRow(0);
        break;
      case "End":
        event.preventDefault();
        focusRow(rows.length - 1);
        break;
      case "Enter":
        if (onRowOpen) {
          event.preventDefault();
          onRowOpen(row);
        }
        break;
      case " ":
        if (selection) {
          event.preventDefault();
          toggleRowSelection(getRowKey(row));
        }
        break;
    }
  }

  function sortIcon(columnKey: string): ReactNode {
    if (sort?.columnKey !== columnKey) return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />;
    return sort.direction === "ascending" ? (
      <ArrowUp className="size-3.5" aria-hidden="true" />
    ) : (
      <ArrowDown className="size-3.5" aria-hidden="true" />
    );
  }

  function ariaSortFor(columnKey: string): "ascending" | "descending" | "none" {
    if (sort?.columnKey !== columnKey) return "none";
    return sort.direction;
  }

  return (
    <Table aria-label={caption}>
      <TableHeader>
        <TableRow>
          {selection && (
            <TableHead className="w-10">
              <Checkbox
                aria-label={translateMessage("dataGrid.selectAllRows")}
                checked={allRowsAreSelected}
                onCheckedChange={(checked) => toggleAllRowSelection(checked === true)}
              />
            </TableHead>
          )}
          {columns.map((column) => (
            <TableHead
              key={column.key}
              scope="col"
              aria-sort={column.isSortable ? ariaSortFor(column.key) : undefined}
              className={cn(alignmentClassNames[column.alignment ?? "start"], column.isSecondary && "hidden md:table-cell")}
            >
              {column.isSortable && onSortChange ? (
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  aria-label={translateMessage("dataGrid.sortBy", { column: column.header })}
                  className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                >
                  {column.header}
                  {sortIcon(column.key)}
                </button>
              ) : (
                column.header
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody ref={bodyReference}>
        {rows.map((row, index) => {
          const rowKey = getRowKey(row);
          const isSelected = selectedRowKeys?.has(rowKey) ?? false;
          return (
            <TableRow
              key={rowKey}
              data-row-index={index}
              data-state={isSelected ? "selected" : undefined}
              tabIndex={index === activeRowIndex ? 0 : -1}
              onFocus={() => setActiveRowIndex(index)}
              onKeyDown={(event) => handleRowKeyDown(event, row, index)}
              onDoubleClick={onRowOpen ? () => onRowOpen(row) : undefined}
              className={cn("focus-visible:bg-muted/60", onRowOpen && "cursor-pointer")}
            >
              {selection && (
                <TableCell className="w-10">
                  <Checkbox
                    aria-label={translateMessage("dataGrid.selectRow")}
                    checked={isSelected}
                    onCheckedChange={() => toggleRowSelection(rowKey)}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(alignmentClassNames[column.alignment ?? "start"], column.isSecondary && "hidden md:table-cell")}
                >
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
      {showTotalsRow && (
        <TableFooter>
          <TableRow>
            {selection && <TableCell />}
            {columns.map((column, columnIndex) => (
              <TableCell
                key={column.key}
                className={cn("font-semibold", alignmentClassNames[column.alignment ?? "start"], column.isSecondary && "hidden md:table-cell")}
              >
                {columnIndex === 0 && column.totalCell === undefined
                  ? (totalsRowLabel ?? translateMessage("dataGrid.totalsRowLabel"))
                  : column.totalCell}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
