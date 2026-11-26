import type { ReactNode } from "react";

export type DataGridColumnAlignment = "start" | "center" | "end";

// One column of a data grid. `key` is also the sort key sent to the server as ?sort=<key> or ?sort=-<key>.
export type DataGridColumn<TRow> = {
  key: string;
  // Already translated.
  header: string;
  render: (row: TRow) => ReactNode;
  // Server-sorted grids set this to true. In a client-sorted grid (no onSortChange) every column whose key is a plain field of
  // the row (text, number, date text) sorts on its own; set false to switch sorting off for a column.
  isSortable?: boolean;
  // What a client-sorted grid sorts by when the key is not a plain field of the row (a joined text, a computed number).
  sortValue?: (row: TRow) => string | number | boolean | null | undefined;
  alignment?: DataGridColumnAlignment;
  // Shown in the totals row under this column (amount columns).
  totalCell?: ReactNode;
  // A secondary column: hidden on small screens.
  isSecondary?: boolean;
};
