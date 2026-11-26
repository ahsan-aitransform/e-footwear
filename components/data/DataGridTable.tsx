"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
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

type SortableValue = string | number | boolean | null | undefined;

// Text compares by the alphabet with numbers inside text in numeric order ("Store 2" before "Store 10"); an empty value goes last.
const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function compareSortableValues(left: SortableValue, right: SortableValue): number {
  const leftIsEmpty = left === null || left === undefined || left === "";
  const rightIsEmpty = right === null || right === undefined || right === "";
  if (leftIsEmpty || rightIsEmpty) return Number(leftIsEmpty) - Number(rightIsEmpty);
  if (typeof left === "number" && typeof right === "number") return left - right;
  return textCollator.compare(String(left), String(right));
}

function isPlainValue(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

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
  // Without onSortChange the grid sorts the rows it was given, in the browser (so it works offline). Set true for a list whose
  // order has a meaning of its own (a ledger with a running balance, rows being typed in).
  isClientSortDisabled?: boolean;
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
  isClientSortDisabled = false,
}: DataGridTableProps<TRow>) {
  const { translateMessage } = useTranslation();
  const bodyReference = useRef<HTMLTableSectionElement>(null);
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [clientSort, setClientSort] = useState<SortState | undefined>(undefined);

  const isClientSorted = onSortChange === undefined && !isClientSortDisabled;
  const activeSort = isClientSorted ? clientSort : sort;
  const firstRow = rows[0] as Record<string, unknown> | undefined;

  function canSortColumn(column: DataGridColumn<TRow>): boolean {
    if (!isClientSorted) return column.isSortable === true && onSortChange !== undefined;
    if (column.isSortable === false) return false;
    return column.sortValue !== undefined || (firstRow !== undefined && isPlainValue(firstRow[column.key]));
  }

  function sortValueOf(column: DataGridColumn<TRow>, row: TRow): SortableValue {
    if (column.sortValue) return column.sortValue(row);
    const value = (row as Record<string, unknown>)[column.key];
    return isPlainValue(value) ? value : undefined;
  }

  const displayedRows = useMemo(() => {
    if (!isClientSorted || !clientSort) return rows;
    const sortColumn = columns.find((column) => column.key === clientSort.columnKey);
    if (!sortColumn) return rows;
    const directionFactor = clientSort.direction === "ascending" ? 1 : -1;
    return [...rows].sort((left, right) => {
      const leftValue = sortValueOf(sortColumn, left);
      const rightValue = sortValueOf(sortColumn, right);
      const leftIsEmpty = leftValue === null || leftValue === undefined || leftValue === "";
      const rightIsEmpty = rightValue === null || rightValue === undefined || rightValue === "";
      // An empty value stays last in both directions.
      if (leftIsEmpty || rightIsEmpty) return compareSortableValues(leftValue, rightValue);
      return directionFactor * compareSortableValues(leftValue, rightValue);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, clientSort, isClientSorted]);

  if (errorMessage) return <div className="p-5"><InlineNotice>{errorMessage}</InlineNotice></div>;
  if (isLoading) return <TableSkeleton rowCount={skeletonRowCount} columnCount={Math.max(columns.length, 2)} />;
  if (rows.length === 0) return <EmptyState title={emptyTitle} text={emptyText} />;

  const selectedRowKeys = selection?.selectedRowKeys;
  const allRowsAreSelected = selectedRowKeys !== undefined && rows.every((row) => selectedRowKeys.has(getRowKey(row)));

  function toggleSort(columnKey: string) {
    const changeSort = isClientSorted ? setClientSort : onSortChange;
    if (!changeSort) return;
    if (activeSort?.columnKey !== columnKey) changeSort({ columnKey, direction: "ascending" });
    else if (activeSort.direction === "ascending") changeSort({ columnKey, direction: "descending" });
    else changeSort(undefined);
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
    if (activeSort?.columnKey !== columnKey) return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />;
    return activeSort.direction === "ascending" ? (
      <ArrowUp className="size-3.5" aria-hidden="true" />
    ) : (
      <ArrowDown className="size-3.5" aria-hidden="true" />
    );
  }

  function ariaSortFor(columnKey: string): "ascending" | "descending" | "none" {
    if (activeSort?.columnKey !== columnKey) return "none";
    return activeSort.direction;
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
              aria-sort={canSortColumn(column) ? ariaSortFor(column.key) : undefined}
              className={cn(alignmentClassNames[column.alignment ?? "start"], column.isSecondary && "hidden md:table-cell")}
            >
              {canSortColumn(column) ? (
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
        {displayedRows.map((row, index) => {
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
