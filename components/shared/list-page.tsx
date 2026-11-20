"use client";
import { useState, type ReactNode } from "react";
import { Card, ErrorAlert, PageHeader } from "@/components/ui/core";
import { DataTable, Pagination, SearchBox, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/form";
import { get, type Page, type Query, type Row } from "@/lib/api";
import { useDebounced, useQuery } from "@/lib/hooks";

/** A searchable, pageable server list: search box + optional date range + extra filters + table. */
export function ListPage({ title, subtitle, endpoint, query, columns, actions, filters, onRow, pageSize = 25, dates, searchable = true, empty, reloadKey, wrap = true, header = true }:
  { title?: ReactNode; subtitle?: ReactNode; endpoint: string; query?: Query; columns: Column[]; actions?: ReactNode; filters?: ReactNode; onRow?: (r: Row) => void; pageSize?: number;
    dates?: boolean; searchable?: boolean; empty?: ReactNode; reloadKey?: unknown; wrap?: boolean; header?: boolean }) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const dq = useDebounced(q, 300);
  const params = JSON.stringify(query ?? {});
  const { data, error, loading } = useQuery(
    () => get<Page<Row>>(endpoint, { ...(query ?? {}), search: dq, from, to, page, pageSize }),
    [endpoint, params, dq, from, to, page, pageSize, reloadKey],
  );

  const body = (
    <>
      <div className="no-print flex flex-wrap items-end gap-2 border-b border-line p-3">
        {searchable && <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} />}
        {dates && (<><Input aria-label="From date" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-40" /><Input aria-label="To date" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-40" /></>)}
        {filters}
      </div>
      <ErrorAlert error={error} />
      <DataTable columns={columns} rows={data?.items} loading={loading} onRowClick={onRow} empty={empty} />
      {data && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} />}
    </>
  );
  return (
    <>
      {header && title && <PageHeader title={title} subtitle={subtitle} actions={actions} />}
      {wrap ? <Card pad={false}>{body}</Card> : body}
    </>
  );
}
