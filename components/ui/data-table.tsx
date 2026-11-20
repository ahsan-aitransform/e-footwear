"use client";
import { useState, type ReactNode } from "react";
import { Button, Empty, Loading, cx } from "./core";
import { Icon } from "./icons";
import { money, qty, dateStr, dateTimeStr } from "@/lib/format";
import type { Row } from "@/lib/api";

export type Column<T = Row> = {
  key: string;
  header: ReactNode;
  render?: (row: T, index: number) => ReactNode;
  type?: "text" | "money" | "number" | "date" | "datetime";
  align?: "left" | "right" | "center";
  className?: string;
  total?: boolean;
};

const fmt = (v: unknown, t?: Column["type"]) => (t === "money" ? money(v) : t === "number" ? qty(v) : t === "date" ? dateStr(v) : t === "datetime" ? dateTimeStr(v) : (v ?? "") as ReactNode);

export function DataTable<T extends Row = Row>({ columns, rows, loading, empty, onRowClick, totals, dense, rowKey, footer }:
  { columns: Column<T>[]; rows: T[] | undefined; loading?: boolean; empty?: ReactNode; onRowClick?: (r: T) => void; totals?: Record<string, number>; dense?: boolean; rowKey?: (r: T, i: number) => string | number; footer?: ReactNode }) {
  if (loading && !rows) return <Loading />;
  if (!rows || rows.length === 0) return <Empty>{empty ?? "No records found."}</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx("whitespace-nowrap border-y border-line px-3 py-2 font-semibold", (c.align === "right" || c.type === "money" || c.type === "number") && "text-right", c.align === "center" && "text-center")}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className={cx(loading && "opacity-60")}>
          {rows.map((r, i) => (
            <tr key={rowKey ? rowKey(r, i) : (r.id as string | number) ?? i} onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cx("border-b border-line hover:bg-primary-50/60", onRowClick && "cursor-pointer")}>
              {columns.map((c) => (
                <td key={c.key} className={cx(dense ? "px-3 py-1.5" : "px-3 py-2", (c.align === "right" || c.type === "money" || c.type === "number") && "num text-right", c.align === "center" && "text-center", c.className)}>
                  {c.render ? c.render(r, i) : fmt(r[c.key], c.type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr className="bg-primary-50 font-semibold">
              {columns.map((c, i) => (
                <td key={c.key} className={cx("border-t-2 border-primary-200 px-3 py-2", (c.type === "money" || c.type === "number") && "num text-right")}>
                  {i === 0 && totals[c.key] === undefined ? "Total" : totals[c.key] !== undefined ? fmt(totals[c.key], c.type) : ""}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {footer}
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return total > 0 ? <div className="no-print px-3 py-2 text-xs text-muted">{total} record{total === 1 ? "" : "s"}</div> : null;
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[13px]">
      <span className="text-muted">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><Icon name="chevron" className="rotate-180" size={14} /></Button>
        <span className="px-2">Page {page} / {pages}</span>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><Icon name="chevron" size={14} /></Button>
      </div>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Search…", autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  return (
    <div className="relative w-full sm:w-64">
      <Icon name="search" size={15} className="absolute left-2.5 top-2.5 text-muted" />
      <input type="search" value={value} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="h-9 w-full rounded-md border border-line-strong bg-white pl-8 pr-2.5 placeholder:text-muted/70" />
    </div>
  );
}

/** Table + search + paging bound to a server list endpoint. */
export function useTablePaging(initial = 25) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  return { page, setPage, q, setQ: (v: string) => { setQ(v); setPage(1); }, pageSize: initial };
}
