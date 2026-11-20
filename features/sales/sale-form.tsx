"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, ErrorAlert, Modal, PageHeader } from "@/components/ui/core";
import { NumberInput, Select } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";
import { ItemEntry, type ItemEntryHandle } from "@/components/shared/item-entry";
import { PartyPicker } from "@/components/shared/pickers";
import { Receipt } from "@/components/shared/receipt";
import { RequirePerm, useMe } from "@/components/session";
import { get, post, type Row } from "@/lib/api";
import { useAction, useHotkey } from "@/lib/hooks";
import { money, qty } from "@/lib/format";

type Line = { key: number; kind: "VARIANT" | "BUNDLE"; barcode: string; variantId?: number; name: string; size?: string; qty: number; list: number; price: number; manual: number | null; taxRate: number; stock?: number; items?: Row[]; bundlePrice?: number };
type Pay = { method: string; amount: number; reference: string };

const METHODS = ["CASH", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE"];
let seq = 1;

/** Mirror of the server's rounding (core.round_money): FLOOR drops the paisa, NEAREST rounds half up. The server recomputes everything. */
const round = (v: number, mode: string) => (mode === "NEAREST" ? Math.round(v) : Math.floor(v + 1e-9));

export function SaleForm() {
  const { me, can } = useMe();
  const router = useRouter();
  const entry = useRef<ItemEntryHandle>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState<Row | null>(null);
  const [salesman, setSalesman] = useState<Row | null>(null);
  const [billDiscount, setBillDiscount] = useState<number | null>(null);
  const [pays, setPays] = useState<Pay[]>([{ method: "CASH", amount: 0, reference: "" }]);
  const [payTouched, setPayTouched] = useState(false);
  const [saleUuid, setSaleUuid] = useState(() => crypto.randomUUID());   // kept until the sale is saved, so a retry can never double-post
  const [receipt, setReceipt] = useState<Row | null>(null);
  const store = me.currentStore;

  const mode = me.company.roundingMode;
  const calc = useMemo(() => {
    const after = lines.map((l) => (l.kind === "BUNDLE" ? l.bundlePrice! * l.qty : round(l.price * l.qty, mode)));
    const gross = lines.map((l, i) => (l.kind === "BUNDLE" ? after[i] : Math.max(round(l.list * l.qty, mode), after[i])));
    const sub = after.reduce((a, b) => a + b, 0);
    const bill = Math.min(billDiscount ?? 0, sub);
    const lastIdx = after.map((a, i) => (a > 0 ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
    const shares: number[] = [];   // the last priced line takes the remainder, so the shares add up exactly (as on the server)
    let given = 0;
    for (let i = 0; i < after.length; i++) { const s = i === lastIdx ? bill - given : sub > 0 ? Math.floor((bill * after[i]) / sub) : 0; shares.push(s); given += s; }
    const tax = lines.reduce((t, l, i) => t + (l.kind === "BUNDLE" ? 0 : round((after[i] - shares[i]) * (l.taxRate / 100), mode)), 0);
    const grossTotal = gross.reduce((a, b) => a + b, 0);
    return { gross: grossTotal, lineDiscount: grossTotal - sub, bill, tax, net: sub - bill + tax };
  }, [lines, billDiscount, mode]);

  // until the cashier edits the payment, the first row follows the bill (the usual "customer pays cash in full")
  const effectivePays = payTouched ? pays : pays.map((p, i) => (i === 0 ? { ...p, amount: calc.net } : p));
  const effPaid = effectivePays.reduce((a, p) => a + (p.amount || 0), 0);
  const change = Math.max(0, effPaid - calc.net);
  const credit = Math.max(0, calc.net - (effPaid - change));

  function addItem(item: Row) {
    if (item.kind === "BUNDLE") {
      setLines((ls) => [...ls, { key: seq++, kind: "BUNDLE", barcode: item.barcode, name: `Deal: ${item.name}`, qty: 1, list: item.bundlePrice, price: item.bundlePrice, manual: null, taxRate: 0, items: item.items, bundlePrice: item.bundlePrice }]);
      return;
    }
    setLines((ls) => {
      const at = ls.findIndex((l) => l.kind === "VARIANT" && l.variantId === item.variantId && l.manual === null);
      if (at >= 0) return ls.map((l, i) => (i === at ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { key: seq++, kind: "VARIANT", barcode: item.barcode, variantId: item.variantId, name: item.productName, size: item.sizeCode, qty: 1, list: item.storeListPrice, price: item.salePrice, manual: null, taxRate: Number(item.taxRate ?? 0), stock: Number(item.stockQty) }];
    });
  }

  const save = useAction(async () => {
    const body = {
      storeId: store.id, saleUuid, customerId: customer?.id, salesmanId: salesman?.id, billDiscount: billDiscount ?? 0,
      lines: lines.map((l) => ({ barcode: l.barcode, variantId: l.kind === "VARIANT" ? l.variantId : undefined, qty: l.qty, unitPrice: l.manual ?? undefined })),
      payments: effectivePays.filter((p) => p.amount > 0).map((p) => ({ method: p.method, amount: p.amount, reference: p.reference || undefined })),
    };
    const r = await post<{ duplicate: boolean; invoice: Row }>("/sales", body);
    const full = await get<Row>(`/sales/${r.invoice.id}/receipt`);
    setReceipt(full);
  });

  function reset() {
    setReceipt(null); setLines([]); setCustomer(null); setSalesman(null); setBillDiscount(null); setPays([{ method: "CASH", amount: 0, reference: "" }]); setPayTouched(false);
    setSaleUuid(crypto.randomUUID());
    setTimeout(() => entry.current?.focus(), 50);
  }

  useHotkey("F10", () => { if (lines.length > 0 && !save.busy) void save.run(); });
  useHotkey("F2", () => entry.current?.focus());

  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <RequirePerm perm="SALE_CREATE">
      <PageHeader title="New sale" subtitle={`${store.name} · F2 scan · F10 save`} actions={<Button variant="secondary" onClick={() => router.push("/sales")}>Invoices</Button>} />
      {store.isHeadOffice && <Alert tone="amber">Head office does not sell. Choose a store in the top bar.</Alert>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <ItemEntry ref={entry} storeId={store.id} onPick={addItem} disabled={store.isHeadOffice} />
          <ErrorAlert error={save.error} onClose={save.clear} />
          <Card pad={false}>
            {lines.length === 0 ? (
              <div className="p-8 text-center text-muted"><Icon name="barcode" size={28} className="mx-auto mb-2" />Scan an item to begin.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-surface text-left text-xs uppercase text-muted"><th className="px-3 py-2">Item</th><th className="px-2">Qty</th><th className="px-2 text-right">Price</th><th className="px-2 text-right">Amount</th><th /></tr></thead>
                  <tbody>
                    {lines.map((l) => {
                      const amount = l.kind === "BUNDLE" ? l.bundlePrice! * l.qty : round((l.manual ?? l.price) * l.qty, mode);
                      return (
                        <tr key={l.key} className="border-t border-line align-top">
                          <td className="px-3 py-2">
                            <div className="font-medium">{l.name}{l.size ? <span className="text-muted"> · size {l.size}</span> : null}</div>
                            {l.kind === "VARIANT" && l.price < l.list && l.manual === null && <div className="text-xs text-success-700">Offer: was {money(l.list)}</div>}
                            {l.kind === "VARIANT" && l.stock !== undefined && l.qty > l.stock && <div className="text-xs text-danger-600">Only {qty(l.stock)} in stock</div>}
                            {l.kind === "BUNDLE" && <div className="text-xs text-muted">{(l.items ?? []).map((i) => `${i.productName} ${i.sizeCode}`).join(" + ")}</div>}
                          </td>
                          <td className="w-24 px-2 py-1"><NumberInput aria-label="Quantity" value={l.qty} min={1} step={1} onValue={(v) => setLine(l.key, { qty: v ?? 1 })} /></td>
                          <td className="w-28 px-2 py-1">
                            {l.kind === "VARIANT" && (can("PRICE_CHANGE") || can("DISCOUNT_MANUAL"))
                              ? <NumberInput aria-label="Unit price" value={l.manual ?? l.price} min={0} step={1} onValue={(v) => setLine(l.key, { manual: v === null || v === l.price ? null : v })} />
                              : <div className="num text-right">{money(l.price)}</div>}
                          </td>
                          <td className="num px-2 text-right font-medium">{money(amount)}</td>
                          <td className="px-2"><button type="button" aria-label="Remove line" className="text-danger-600" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Icon name="trash" size={15} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <Card title="Customer">
            <div className="space-y-3">
              <PartyPicker kind="customer" value={customer} onChange={setCustomer} label="Customer (optional, needed for credit)" />
              <PartyPicker kind="staff" value={salesman} onChange={setSalesman} label="Salesman (optional)" />
            </div>
          </Card>
          <Card title="Bill">
            <dl className="space-y-1 text-[13px]">
              <Row k="Gross" v={money(calc.gross)} />
              {calc.lineDiscount > 0 && <Row k="Offers & discounts" v={`− ${money(calc.lineDiscount)}`} />}
              {can("DISCOUNT_MANUAL") && <div className="py-1"><NumberInput label="Bill discount" value={billDiscount} min={0} step={1} onValue={setBillDiscount} /></div>}
              {calc.bill > 0 && <Row k="Bill discount" v={`− ${money(calc.bill)}`} />}
              {calc.tax > 0 && <Row k="Tax" v={money(calc.tax)} />}
              <div className="flex items-baseline justify-between border-t border-line pt-2 text-lg font-semibold"><dt>Net payable</dt><dd className="num">{money(calc.net)}</dd></div>
            </dl>
            <div className="mt-3 space-y-2">
              {effectivePays.map((p, i) => (
                <div key={i} className="grid grid-cols-5 gap-2">
                  <Select aria-label="Payment method" className="col-span-2" value={p.method} onChange={(e) => { setPayTouched(true); setPays(effectivePays.map((x, j) => (j === i ? { ...x, method: e.target.value } : x))); }}>
                    {METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                  </Select>
                  <NumberInput aria-label="Amount" className="col-span-3" value={p.amount} min={0} step={1} onValue={(v) => { setPayTouched(true); setPays(effectivePays.map((x, j) => (j === i ? { ...x, amount: v ?? 0 } : x))); }} />
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setPayTouched(true); setPays([...effectivePays, { method: "CARD", amount: 0, reference: "" }]); }}>Split payment</Button>
                {pays.length > 1 && <Button size="sm" variant="secondary" onClick={() => { setPayTouched(true); setPays(effectivePays.slice(0, -1)); }}>Remove</Button>}
              </div>
              {change > 0 && <Row k="Change to give" v={money(change)} strong />}
              {credit > 0 && <Alert tone="amber">{money(credit)} will be on the customer&apos;s account{customer ? "" : " — choose a customer first"}.</Alert>}
            </div>
            <Button size="lg" className="mt-3 w-full" loading={save.busy} disabled={lines.length === 0 || store.isHeadOffice} onClick={() => void save.run()}>Save & print (F10)</Button>
          </Card>
        </div>
      </div>

      <Modal open={!!receipt} title={receipt ? `Invoice #${receipt.invoiceNo}` : ""} onClose={reset}
        footer={<><Button variant="secondary" onClick={reset}>New sale</Button><Button icon="print" onClick={() => window.print()}>Print</Button></>}>
        {receipt && <Receipt data={receipt} />}
      </Modal>
    </RequirePerm>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "font-semibold" : ""}`}><dt className="text-muted">{k}</dt><dd className="num">{v}</dd></div>;
}
