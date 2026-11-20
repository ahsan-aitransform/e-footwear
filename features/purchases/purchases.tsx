"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, ConfirmDialog, ErrorAlert, Loading, PageHeader, StatusBadge, useToast } from "@/components/ui/core";
import { DataTable } from "@/components/ui/data-table";
import { Checkbox, FormGrid, Input, NumberInput } from "@/components/ui/form";
import { fieldError } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";
import { ItemEntry, type ItemEntryHandle } from "@/components/shared/item-entry";
import { ListPage } from "@/components/shared/list-page";
import { PartyPicker } from "@/components/shared/pickers";
import { RequirePerm, useMe } from "@/components/session";
import { get, post, type Row } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { money, qty, today } from "@/lib/format";

const READ = ["PURCHASE_CREATE", "PURCHASE_PAY", "REPORT_VIEW", "VOUCHER_POST"];

export function PurchasesList() {
  const router = useRouter();
  const { can } = useMe();
  return (
    <RequirePerm any={READ}>
      <ListPage title="Purchase history" subtitle="Vendor bills and returns." endpoint="/purchases" dates
        actions={can("PURCHASE_CREATE") ? <Button onClick={() => router.push("/purchases/new")}>New purchase</Button> : undefined}
        onRow={(r) => router.push(`/purchases/${r.id}`)}
        columns={[
          { key: "invoiceNo", header: "No." }, { key: "billDate", header: "Date", type: "date" },
          { key: "docType", header: "Type", render: (r) => <StatusBadge value={r.docType} /> },
          { key: "vendor", header: "Vendor" }, { key: "vendorBillNo", header: "Vendor bill" }, { key: "store", header: "Store" },
          { key: "dueDate", header: "Due", type: "date" }, { key: "netAmount", header: "Net", type: "money" },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]} />
    </RequirePerm>
  );
}

type PLine = { key: number; variantId: number; name: string; size: string; qty: number; unitCost: number; salePrice: number; updatesSalePrice: boolean };
let seq = 1;

export function PurchaseForm() {
  const { me } = useMe();
  const router = useRouter();
  const toast = useToast();
  const entry = useRef<ItemEntryHandle>(null);
  const [vendor, setVendor] = useState<Row | null>(null);
  const [vendorBillNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState<number | null>(null);
  const [tax, setTax] = useState<number | null>(null);
  const [lines, setLines] = useState<PLine[]>([]);
  const store = me.currentStore;

  const gross = lines.reduce((a, l) => a + Math.floor(l.qty * l.unitCost), 0);
  const net = gross - (discount ?? 0) + (tax ?? 0);

  function add(item: Row) {
    if (item.kind !== "VARIANT") return;
    setLines((ls) => {
      if (ls.some((l) => l.variantId === item.variantId)) return ls.map((l) => (l.variantId === item.variantId ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { key: seq++, variantId: item.variantId, name: item.productName, size: item.sizeCode, qty: 1, unitCost: Number(item.purchasePrice ?? 0), salePrice: Number(item.listPrice ?? 0), updatesSalePrice: false }];
    });
  }
  const set = (key: number, patch: Partial<PLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const save = useAction(async () => {
    const inv = await post<Row>("/purchases", {
      storeId: store.id, vendorId: vendor?.id, vendorBillNo: vendorBillNo || undefined, billDate, dueDate: dueDate || undefined, discount: discount ?? 0, tax: tax ?? 0,
      lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty, unitCost: l.unitCost, salePrice: l.salePrice, updatesSalePrice: l.updatesSalePrice })),
    });
    toast(`Purchase #${inv.invoiceNo} saved — stock received.`, "green");
    router.push(`/purchases/${inv.id}`);
  });

  return (
    <RequirePerm perm="PURCHASE_CREATE">
      <PageHeader title="New purchase" subtitle={`Stock is received into ${store.name}`} />
      {store.isHeadOffice && <Alert tone="amber">Head office holds no stock. Choose a store in the top bar.</Alert>}
      <ErrorAlert error={save.error} onClose={save.clear} />
      <Card>
        <FormGrid cols={4}>
          <PartyPicker kind="vendor" value={vendor} onChange={setVendor} label="Vendor" required error={fieldError(save.error, "vendorId")} />
          <Input label="Vendor's bill no." value={vendorBillNo} onChange={(e) => setBillNo(e.target.value)} hint="The same bill cannot be entered twice." />
          <Input label="Bill date" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} error={fieldError(save.error, "dueDate")} />
        </FormGrid>
      </Card>
      <div className="mt-3 space-y-3">
        <ItemEntry ref={entry} storeId={store.id} onPick={add} disabled={store.isHeadOffice} />
        <Card pad={false}>
          {lines.length === 0 ? <div className="p-8 text-center text-muted">Scan or search the items on the bill.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="bg-surface text-left text-xs uppercase text-muted"><th className="px-3 py-2">Item</th><th className="px-2">Qty</th><th className="px-2">Cost</th><th className="px-2">Sale price</th><th className="px-2">Update price</th><th className="px-2 text-right">Amount</th><th /></tr></thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.key} className="border-t border-line">
                      <td className="px-3 py-2 font-medium">{l.name} <span className="text-muted">· {l.size}</span></td>
                      <td className="w-24 px-2 py-1"><NumberInput aria-label="Quantity" value={l.qty} min={1} step={1} onValue={(v) => set(l.key, { qty: v ?? 1 })} /></td>
                      <td className="w-28 px-2 py-1"><NumberInput aria-label="Cost" value={l.unitCost} min={0} step={1} onValue={(v) => set(l.key, { unitCost: v ?? 0 })} /></td>
                      <td className="w-28 px-2 py-1"><NumberInput aria-label="Sale price" value={l.salePrice} min={0} step={1} onValue={(v) => set(l.key, { salePrice: v ?? 0 })} /></td>
                      <td className="px-2"><Checkbox label="" aria-label="Update the sale price" checked={l.updatesSalePrice} onChange={(e) => set(l.key, { updatesSalePrice: e.target.checked })} /></td>
                      <td className="num px-2 text-right">{money(Math.floor(l.qty * l.unitCost))}</td>
                      <td className="px-2"><button type="button" aria-label="Remove line" className="text-danger-600" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Icon name="trash" size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex gap-3">
              <NumberInput label="Discount" value={discount} min={0} step={1} onValue={setDiscount} error={fieldError(save.error, "discount")} />
              <NumberInput label="Tax" value={tax} min={0} step={1} onValue={setTax} />
            </div>
            <div className="text-right"><div className="text-xs text-muted">Gross {money(gross)}</div><div className="text-xl font-semibold">Payable {money(net)}</div></div>
            <Button size="lg" loading={save.busy} disabled={!vendor || lines.length === 0 || store.isHeadOffice} onClick={() => void save.run()}>Save purchase</Button>
          </div>
          <p className="mt-2 text-xs text-muted">The discount and tax are spread over the items, so each piece&apos;s cost is what you really paid. Pay the vendor later with a payment voucher.</p>
        </Card>
      </div>
    </RequirePerm>
  );
}

export function PurchaseView({ id }: { id: number }) {
  const { can } = useMe();
  const router = useRouter();
  const toast = useToast();
  const [rev, setRev] = useState(0);
  const { data, error, loading } = useQuery(() => get<Row>(`/purchases/${id}`), [id, rev]);
  const [voidOpen, setVoidOpen] = useState(false);
  const [returning, setReturning] = useState(false);
  const [q, setQ] = useState<Record<number, number>>({});

  const doVoid = useAction(async (reason: string) => {
    await post(`/purchases/${id}/void`, { reason });
    toast("Purchase voided.", "green");
    setVoidOpen(false); setRev((r) => r + 1);
  });
  const doReturn = useAction(async () => {
    const lines = Object.entries(q).filter(([, v]) => v > 0).map(([lineId, v]) => ({ originalLineId: Number(lineId), qty: v }));
    const r = await post<Row>("/purchases/returns", { originalInvoiceId: id, lines });
    toast(`Return #${r.invoiceNo} posted.`, "green");
    router.push(`/purchases/${r.id}`);
  });

  if (loading && !data) return <Loading />;
  if (error) return <ErrorAlert error={error} />;
  if (!data) return null;
  const posted = data.status === "POSTED";
  return (
    <RequirePerm any={READ}>
      <PageHeader title={`${data.docType === "RETURN" ? "Purchase return" : "Purchase"} #${data.invoiceNo}`} subtitle={`${data.vendor} · ${data.store}`}
        actions={<>
          {posted && data.docType === "PURCHASE" && can("PURCHASE_CREATE") && <Button variant="secondary" onClick={() => setReturning((v) => !v)}>Return items</Button>}
          {posted && can("VOUCHER_DELETE") && <Button variant="danger" onClick={() => setVoidOpen(true)}>Void</Button>}
        </>} />
      {data.status === "VOID" && <Alert tone="amber">Voided{data.voidReason ? `: ${data.voidReason}` : ""}.</Alert>}
      <ErrorAlert error={doVoid.error ?? doReturn.error} onClose={() => { doVoid.clear(); doReturn.clear(); }} />
      {returning && (
        <Card title="Return items to the vendor" className="mb-4">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-xs uppercase text-muted"><th>Item</th><th>Bought</th><th>Returned</th><th>Return now</th></tr></thead>
            <tbody>{(data.lines as Row[]).map((l) => {
              const left = Number(l.qty) - Number(l.returnedQty);
              return (<tr key={l.id} className="border-t border-line"><td className="py-1.5">{l.productName} · {l.sizeCode}</td><td>{qty(l.qty)}</td><td>{qty(l.returnedQty)}</td>
                <td className="w-32"><NumberInput aria-label="Return quantity" value={q[l.id] ?? null} min={0} max={left} step={1} disabled={left <= 0} onValue={(v) => setQ({ ...q, [l.id]: v ?? 0 })} /></td></tr>);
            })}</tbody>
          </table>
          <Button className="mt-3" loading={doReturn.busy} disabled={!Object.values(q).some((v) => v > 0)} onClick={() => void doReturn.run()}>Post return</Button>
        </Card>
      )}
      <Card pad={false}>
        <DataTable dense rows={data.lines as Row[]} columns={[
          { key: "productName", header: "Item", render: (l) => <span>{l.productName} <span className="text-muted">· {l.sizeCode}</span></span> },
          { key: "qty", header: "Qty", type: "number" }, { key: "unitCost", header: "Cost", type: "money" }, { key: "salePrice", header: "Sale price", type: "money" }, { key: "lineAmount", header: "Amount", type: "money" },
        ]} />
        <div className="grid grid-cols-2 gap-2 p-3 text-[13px] sm:grid-cols-5">
          <div><div className="text-xs text-muted">Gross</div><div className="num">{money(data.grossAmount)}</div></div>
          <div><div className="text-xs text-muted">Discount</div><div className="num">{money(data.discountAmount)}</div></div>
          <div><div className="text-xs text-muted">Tax</div><div className="num">{money(data.taxAmount)}</div></div>
          <div><div className="text-xs text-muted">Net</div><div className="num font-semibold">{money(data.netAmount)}</div></div>
          <div><div className="text-xs text-muted">Vendor bill</div><div>{data.vendorBillNo ?? "—"}</div></div>
        </div>
      </Card>
      <ConfirmDialog open={voidOpen} title="Void this document?" danger confirmLabel="Void" reasonLabel="Reason (required)"
        message="Stock and the vendor's account are reversed. This is refused if the stock has already been sold." onClose={() => setVoidOpen(false)} onConfirm={(reason) => void doVoid.run(reason ?? "")} />
    </RequirePerm>
  );
}
