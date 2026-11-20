"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, ErrorAlert, Loading, PageHeader } from "@/components/ui/core";
import { DataTable, SearchBox, type Column } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/form";
import { AccountSelect, CategorySelect, PartyPicker, StoreSelect } from "@/components/shared/pickers";
import { RequirePerm, useMe } from "@/components/session";
import { get, type Row } from "@/lib/api";
import { useAction, useParam, useQuery } from "@/lib/hooks";
import { csv, dateStr, download, monthStart, today } from "@/lib/format";

type Meta = { key: string; title: string; group: string; permission: string; filters: string[] };
type Result = { key: string; title: string; from: string; to: string; rows: Row[] };

export function ReportsIndex() {
  const [q, setQ] = useState("");
  const { data, error, loading } = useQuery(() => get<Meta[]>("/reports"), []);
  const groups = useMemo(() => {
    const m = new Map<string, Meta[]>();
    (data ?? []).filter((r) => r.title.toLowerCase().includes(q.toLowerCase())).forEach((r) => m.set(r.group, [...(m.get(r.group) ?? []), r]));
    return [...m.entries()];
  }, [data, q]);
  return (
    <RequirePerm any={["REPORT_VIEW", "REPORT_ACCOUNTS"]}>
      <PageHeader title="Reports" subtitle="Each report can be run for one store or all the stores you may see" actions={<SearchBox value={q} onChange={setQ} placeholder="Find a report…" />} />
      <ErrorAlert error={error} />
      {loading && !data && <Loading />}
      {data && data.length === 0 && <Alert tone="amber">Your account has no report permissions.</Alert>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(([g, items]) => (
          <Card key={g} title={g}><ul className="space-y-0.5">{items.map((r) => <li key={r.key}><Link className="block rounded px-2 py-1.5 text-primary-700 hover:bg-primary-50" href={`/reports/run?key=${encodeURIComponent(r.key)}`}>{r.title}</Link></li>)}</ul></Card>
        ))}
      </div>
    </RequirePerm>
  );
}

const DOC = [["", "All"], ["SALE", "Sales"], ["RETURN", "Returns"]];
const MONEY = /(amount|balance|net|debit|credit|value|cost|profit|opening|closing|running|gross|total|earned|reversed|price|payable|sales|due|paid|remaining|days_|notdue|over90|days\d)/i;
const QTY = /^(qty|quantity|count|entries|onHand|stockQty|units)/i;
const HIDE = /(^id$|Id$|^outId)/;   // surrogate keys are noise in a printed report

const label = (k: string) => k.replace(/^out/, "").replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim().replace(/^./, (c) => c.toUpperCase());

export function ReportRunner() {
  const { me } = useMe();
  const [key] = useParam("key");
  const { data: catalog } = useQuery(() => get<Meta[]>("/reports"), []);
  const meta = catalog?.find((r) => r.key === key);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [account, setAccount] = useState<number | null>(null);
  const [vendor, setVendor] = useState<Row | null>(null);
  const [customer, setCustomer] = useState<Row | null>(null);
  const [category, setCategory] = useState<number | null>(null);
  const [docType, setDocType] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const f = meta?.filters ?? [];
  const run = useAction(async () => {
    setResult(await get<Result>(`/reports/${encodeURIComponent(key!)}`, { storeId, from, to, accountId: account, vendorId: vendor?.id, customerId: customer?.id, categoryId: category, docType: docType || undefined }));
  });

  const rows = useMemo(() => result?.rows ?? [], [result]);
  const columns: Column[] = useMemo(() => rows.length === 0 ? [] : Object.keys(rows[0]).filter((k) => !HIDE.test(k) || /name/i.test(k)).map((k) => ({
    key: k, header: label(k), type: /date/i.test(k) ? "date" : QTY.test(k) ? "number" : MONEY.test(k) && typeof rows[0][k] === "number" ? "money" : "text",
  })), [rows]);
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const c of columns) if (c.type === "money" || c.type === "number") t[c.key] = rows.reduce((a, r) => a + Number(r[c.key] ?? 0), 0);
    return t;
  }, [columns, rows]);
  const skipTotals = key === "account-ledger" || key === "account-balance" || key === "trial-balance";
  const exportCsv = () => result && download(`${result.title.replace(/\W+/g, "_")}.csv`, csv([[result.title, `${result.from} to ${result.to}`], columns.map((c) => String(c.header)), ...rows.map((r) => columns.map((c) => r[c.key] as string))]));

  if (!key) return <Alert tone="amber">Choose a report from the list.</Alert>;
  if (catalog && !meta) return <Alert tone="amber">You do not have access to this report.</Alert>;
  return (
    <RequirePerm any={["REPORT_VIEW", "REPORT_ACCOUNTS"]}>
      <PageHeader title={meta?.title ?? "Report"} subtitle={meta?.group} actions={<Link href="/reports"><Button variant="secondary">All reports</Button></Link>} />
      <Card title="Filters" actions={<Button icon="refresh" loading={run.busy} onClick={() => void run.run()}>Run report</Button>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {f.includes("store") && <StoreSelect all value={storeId} onChange={setStoreId} />}
          {f.includes("dates") && (<><Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></>)}
          {f.includes("asOf") && <Input label="As on date" type="date" value={to} onChange={(e) => setTo(e.target.value)} />}
          {f.includes("account") && <AccountSelect label="Account" value={account} onChange={setAccount} />}
          {f.includes("vendor") && <PartyPicker kind="vendor" label="Vendor" value={vendor} onChange={setVendor} />}
          {f.includes("customer") && <PartyPicker kind="customer" label="Customer" value={customer} onChange={setCustomer} />}
          {f.includes("category") && <CategorySelect label="Category" value={category} onChange={setCategory} />}
          {f.includes("docType") && <Select label="Document type" value={docType} onChange={(e) => setDocType(e.target.value)}>{DOC.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}
        </div>
      </Card>
      <ErrorAlert error={run.error} onClose={run.clear} />
      {result && (
        <Card className="mt-4 print-area" pad={false} title={`${result.title} — ${dateStr(result.from)} to ${dateStr(result.to)}${storeId ? ` · ${me.stores.find((s) => s.id === storeId)?.name ?? ""}` : " · all stores"}`}
          actions={<><Button size="sm" variant="secondary" icon="download" onClick={exportCsv}>Excel (CSV)</Button><Button size="sm" variant="secondary" icon="print" onClick={() => window.print()}>Print / PDF</Button></>}>
          <DataTable dense rows={rows} columns={columns} rowKey={(_, i) => i} totals={skipTotals ? undefined : totals} empty="No data for these filters." />
          <p className="no-print px-3 py-2 text-xs text-muted">{rows.length} rows</p>
        </Card>
      )}
    </RequirePerm>
  );
}
