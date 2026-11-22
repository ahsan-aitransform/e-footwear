import type { ReactNode } from "react";

export type DataGridColumnAlignment = "start" | "center" | "end";

// One column of a data grid. `key` is also the sort key sent to the server as ?sort=<key> or ?sort=-<key>.
export type DataGridColumn<TRow> = {
  key: string;
  // Already translated.
  header: string;
  render: (row: TRow) => ReactNode;
  isSortable?: boolean;
  alignment?: DataGridColumnAlignment;
  // Shown in the totals row under this column (amount columns).
  totalCell?: ReactNode;
  // A secondary column: hidden on small screens.
  isSecondary?: boolean;
};
