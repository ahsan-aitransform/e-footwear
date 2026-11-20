"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, ConfirmDialog, ErrorAlert, Loading, PageHeader, StatusBadge, useToast } from "@/components/ui/core";
import { DataTable } from "@/components/ui/data-table";
import { NumberInput, Select } from "@/components/ui/form";
import { ListPage } from "@/components/shared/list-page";
import { Receipt } from "@/components/shared/receipt";
import { StoreSelect } from "@/components/shared/pickers";
import { RequirePerm, useMe } from "@/components/session";
import { get, post, type Row } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { dateTimeStr, money, qty } from "@/lib/format";

const READ = ["SALE_CREATE", "SALE_RETURN", "REPORT_VIEW", "VOUCHER_DELETE"];

export function SalesList() {
  const router = useRouter();
  const { me, can } = useMe();
  const [store, setStore] = useState<number | null>(null);
  const [docType, setDocType] = useState("");
  return (
    <RequirePerm any={READ}>
      <ListPage title="Invoices" subtitle="Sales and returns. Click an invoice to view, print, return or void it." endpoint="/sales" dates
        query={{ storeId: store, docType: docType || undefined }}
        actions={can("SALE_CREATE") ? <Button onClick={() => router.push("/sales/new")}>New sale</Button> : undefined}
        filters={<>{me.stores.length > 2 && <StoreSelect all value={store} onChange={setStore} label="" />}
          <Select aria-label="Type" value={docType} onChange={(e) => setDocType(e.target.value)}><option value="">All types</option><option value="SALE">Sales</option><option value="RETURN">Returns</option></Select></>}
        onRow={(r) => router.push(`/sales/${r.id}`)}
        columns={[
          { key: "invoiceNo", header: "No." }, { key: "saleDate", header: "Date", type: "date" },
          { key: "docType", header: "Type", render: (r) => <StatusBadge value={r.docType} /> },
          { key: "customer", header: "Customer" }, { key: "salesman", header: "Salesman" }, { key: "store", header: "Store" },
          { key: "netAmount", header: "Net", type: "money" }, { key: "creditAmount", header: "On account", type: "money" },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]} />
    </RequirePerm>
  );
}

/** One invoice: receipt, lines, return (choose quantities) and void (with a reason). */
export function SaleView({ id }: { id: number }) {
  const { can } = useMe();
  const router = useRouter();
  const toast = useToast();
  const [rev, setRev] = useState(0);
  const { data, error, loading } = useQuery(() => get<Row>(`/sales/${id}/receipt`), [id, rev]);
  const [voidOpen, setVoidOpen] = useState(false);
  const [returning, setReturning] = useState(false);

  const doVoid = useAction(async (reason: string) => {
    await post(`/sales/${id}/void`, { reason });
    toast("Invoice voided — stock and ledger reversed.", "green");
    setVoidOpen(false); setRev((r) => r + 1);
  });

  if (loading && !data) return <Loading />;
  if (error) return <ErrorAlert error={error} />;
  if (!data) return null;
  const posted = data.status === "POSTED";
  return (
    <RequirePerm any={READ}>
      <PageHeader title={`${data.docType === "RETURN" ? "Return" : "Invoice"} #${data.invoiceNo}`} subtitle={`${data.store} · ${dateTimeStr(data.occurredAt)}`}
        actions={<>
          <Button variant="secondary" icon="print" onClick={() => window.print()}>Print</Button>
          {posted && data.docType === "SALE" && can("SALE_RETURN") && <Button variant="secondary" onClick={() => setReturning((v) => !v)}>Return items</Button>}
          {posted && can("VOUCHER_DELETE") && <Button variant="danger" onClick={() => setVoidOpen(true)}>Void</Button>}
        </>} />
      {data.status === "VOID" && <Alert tone="amber">This invoice was voided{data.voidReason ? `: ${data.voidReason}` : ""}. Stock and the ledger were reversed.</Alert>}
      {data.hasShortfall && <Alert tone="amber">Part of this sale had no stock when it was posted (sold on a shortfall).</Alert>}
      {returning && <ReturnPanel invoiceId={id} onDone={(rid) => { setReturning(false); setRev((r) => r + 1); toast("Return posted.", "green"); router.push(`/sales/${rid}`); }} />}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Items" pad={false}>
          <DataTable dense rows={data.lines as Row[]} columns={[
            { key: "productName", header: "Item", render: (l) => <span>{l.productName} <span className="text-muted">· {l.sizeCode}</span></span> },
            { key: "qty", header: "Qty", type: "number" }, { key: "listPrice", header: "List", type: "money" }, { key: "unitPrice", header: "Charged", type: "money" },
            { key: "discountAmount", header: "Discount", type: "money" }, { key: "netAmount", header: "Amount", type: "money" },
            { key: "discountSource", header: "How", render: (l) => <span className="text-xs text-muted">{l.discountSource === "NONE" ? "" : l.discountSource}</span> },
          ]} />
          <div className="grid grid-cols-2 gap-2 p-3 text-[13px] sm:grid-cols-4">
            <Fact k="Net" v={money(data.netAmount)} /><Fact k="Paid" v={money(data.paidAmount)} /><Fact k="Change" v={money(data.changeAmount)} /><Fact k="On account" v={money(data.creditAmount)} />
            {can("REPORT_VIEW") && <Fact k="Cost" v={money(data.costAmount)} />}
            <Fact k="Customer" v={data.customer ?? "Cash Sale"} /><Fact k="Salesman" v={data.salesman ?? "—"} />
          </div>
        </Card>
        <div className="print-area"><Receipt data={data} /></div>
      </div>
      <ConfirmDialog open={voidOpen} title="Void this invoice?" danger confirmLabel="Void invoice" reasonLabel="Reason (required)"
        message="The stock goes back, the ledger entry is reversed and the invoice stays on file as VOID." onClose={() => setVoidOpen(false)} onConfirm={(reason) => void doVoid.run(reason ?? "")} />
      <ErrorAlert error={doVoid.error} onClose={doVoid.clear} />
    </RequirePerm>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div><div className="text-xs text-muted">{k}</div><div className="num font-medium">{v}</div></div>;
}

function ReturnPanel({ invoiceId, onDone }: { invoiceId: number; onDone: (returnId: number) => void }) {
  const { data, error } = useQuery(() => get<Row>(`/sales/${invoiceId}/returnable`), [invoiceId]);
  const [q, setQ] = useState<Record<number, number>>({});
  const submit = useAction(async () => {
    const lines = Object.entries(q).filter(([, v]) => v > 0).map(([id, v]) => ({ originalLineId: Number(id), qty: v }));
    const r = await post<{ invoice: Row }>("/sales/returns", { originalInvoiceId: invoiceId, lines });
    onDone(r.invoice.id as number);
  });
  const rows = ((data?.returnable ?? []) as Row[]);
  return (
    <Card title="Return items" className="mb-4">
      <ErrorAlert error={error ?? submit.error} onClose={submit.clear} />
      <p className="mb-2 text-[13px] text-muted">The value comes back as credit on the customer&apos;s account at the price they paid (no cash refund is recorded; without a customer it is held for the accountant).</p>
      <table className="w-full text-[13px]">
        <thead><tr className="text-left text-xs uppercase text-muted"><th>Item</th><th>Sold</th><th>Returned</th><th>Return now</th></tr></thead>
        <tbody>
          {rows.map((l) => {
            const left = Number(l.qty) - Number(l.returnedQty);
            const name = (data?.lines as Row[] | undefined)?.find((x) => x.id === l.id);
            return (
              <tr key={l.id} className="border-t border-line">
                <td className="py-1.5">{name ? `${name.productName} · ${name.sizeCode}` : `Line ${l.lineNo}`}</td><td>{qty(l.qty)}</td><td>{qty(l.returnedQty)}</td>
                <td className="w-32"><NumberInput aria-label="Return quantity" value={q[l.id] ?? null} min={0} max={left} step={1} disabled={left <= 0} onValue={(v) => setQ({ ...q, [l.id]: v ?? 0 })} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Button className="mt-3" loading={submit.busy} disabled={!Object.values(q).some((v) => v > 0)} onClick={() => void submit.run()}>Post return</Button>
    </Card>
  );
}
