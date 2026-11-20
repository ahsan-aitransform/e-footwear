"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, ConfirmDialog, ErrorAlert, Loading, PageHeader, StatusBadge, useToast } from "@/components/ui/core";
import { DataTable } from "@/components/ui/data-table";
import { FormGrid, Input, NumberInput, Select, TextArea } from "@/components/ui/form";
import { fieldError } from "@/components/ui/form";
import { ListPage } from "@/components/shared/list-page";
import { AccountSelect, PartyPicker, StoreSelect } from "@/components/shared/pickers";
import { RequirePerm, useMe } from "@/components/session";
import { get, post, type Row } from "@/lib/api";
import { useAction, useParam, useQuery } from "@/lib/hooks";
import { dateStr, money, today } from "@/lib/format";

const ANY = ["VOUCHER_POST", "PURCHASE_PAY", "EXPENSE_RECORD", "EXPENSE_APPROVE", "REPORT_ACCOUNTS"];
type VType = "PAYMENT" | "RECEIPT" | "EXPENSE" | "JOURNAL";
const TYPES: VType[] = ["PAYMENT", "RECEIPT", "EXPENSE", "JOURNAL"];
const MODES = ["CASH", "BANK", "CHEQUE", "ONLINE", "OTHER"];

export function VouchersList() {
  const router = useRouter();
  const { can } = useMe();
  const [type, setType] = useState("");
  return (
    <RequirePerm any={ANY}>
      <ListPage title="Vouchers" endpoint="/accounting/vouchers" dates query={{ type: type || undefined }} onRow={(r) => router.push(`/vouchers/${r.id}`)}
        actions={can("VOUCHER_POST") ? <Button onClick={() => router.push("/vouchers/new?type=PAYMENT")}>New voucher</Button> : undefined}
        filters={<Select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select>}
        columns={[
          { key: "voucherNo", header: "No." }, { key: "voucherDate", header: "Date", type: "date" }, { key: "voucherType", header: "Type", render: (r) => <StatusBadge value={r.voucherType} /> },
          { key: "party", header: "Party" }, { key: "debitName", header: "Debit" }, { key: "creditName", header: "Credit" }, { key: "amount", header: "Amount", type: "money" },
          { key: "paymentMode", header: "Mode" }, { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]} />
    </RequirePerm>
  );
}

export function VoucherForm() {
  const { me } = useMe();
  const router = useRouter();
  const toast = useToast();
  const [t] = useParam("type");
  const [preParty] = useParam("partyId");
  const type: VType = TYPES.includes(t as VType) ? (t as VType) : "PAYMENT";
  const [store, setStore] = useState<number | null>(me.currentStore.id);
  const [date, setDate] = useState(today());
  const [party, setParty] = useState<Row | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [mode, setMode] = useState("CASH");
  const [ref, setRef] = useState("");
  const [desc, setDesc] = useState("");
  const [expenseAcc, setExpenseAcc] = useState<number | null>(null);
  const [debitAcc, setDebitAcc] = useState<number | null>(null);
  const [creditAcc, setCreditAcc] = useState<number | null>(null);
  const [alloc, setAlloc] = useState<Record<number, number>>({});

  useEffect(() => {
    if (preParty && !party) get<Row>(`/parties/${preParty}`).then(setParty).catch(() => undefined);
  }, [preParty, party]);
  const bills = useQuery(() => get<Row[]>(`/accounting/vendors/${party!.id}/open-bills`), [party?.id], { skip: type !== "PAYMENT" || !party?.isVendor });
  const settled = Object.values(alloc).reduce((a, b) => a + (b || 0), 0);

  const save = useAction(async () => {
    const r = await post<Row>("/accounting/vouchers", {
      type, storeId: store, date, partyId: party?.id, amount, mode: type === "JOURNAL" ? undefined : mode, refNo: ref || undefined, description: desc || undefined,
      expenseAccountId: type === "EXPENSE" ? expenseAcc : undefined, debitAccountId: type === "JOURNAL" ? debitAcc : undefined, creditAccountId: type === "JOURNAL" ? creditAcc : undefined,
      allocations: Object.entries(alloc).filter(([, v]) => v > 0).map(([id, v]) => ({ purchaseInvoiceId: Number(id), amount: v })),
    });
    toast(`Voucher #${r.voucherNo} posted.`, "green");
    router.push(`/vouchers/${r.id}`);
  });

  return (
    <RequirePerm any={ANY}>
      <PageHeader title={`${type[0]}${type.slice(1).toLowerCase()} voucher`} subtitle="Each voucher posts one balanced entry; to correct a mistake void it and post again." />
      <div className="mb-3 flex flex-wrap gap-2">{TYPES.map((x) => <Button key={x} size="sm" variant={x === type ? "primary" : "secondary"} onClick={() => router.replace(`/vouchers/new?type=${x}`)}>{x}</Button>)}</div>
      <ErrorAlert error={save.error} onClose={save.clear} />
      <Card>
        <FormGrid cols={3}>
          <StoreSelect label="Store" withHeadOffice value={store} onChange={setStore} />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <NumberInput label="Amount" required value={amount} min={1} step={1} onValue={setAmount} error={fieldError(save.error, "amount")} />
          {(type === "PAYMENT" || type === "RECEIPT") && <PartyPicker kind={type === "RECEIPT" ? "customer" : "vendor"} label={type === "RECEIPT" ? "Customer" : "Vendor"} required value={party} onChange={(p) => { setParty(p); setAlloc({}); }} error={fieldError(save.error, "partyId")} />}
          {type === "EXPENSE" && <AccountSelect label="Expense account" types={["EXPENSE"]} value={expenseAcc} onChange={setExpenseAcc} error={fieldError(save.error, "expenseAccountId")} />}
          {type === "JOURNAL" && (<><AccountSelect label="Debit account" value={debitAcc} onChange={setDebitAcc} error={fieldError(save.error, "debitAccountId")} /><AccountSelect label="Credit account" value={creditAcc} onChange={setCreditAcc} error={fieldError(save.error, "creditAccountId")} /><PartyPicker kind="customer" label="Party (for party-control accounts)" value={party} onChange={setParty} /></>)}
          {type !== "JOURNAL" && <Select label={type === "RECEIPT" ? "Received as" : "Paid by"} value={mode} onChange={(e) => setMode(e.target.value)}>{MODES.map((m) => <option key={m} value={m}>{m}</option>)}</Select>}
          <Input label="Reference (cheque / slip no.)" value={ref} onChange={(e) => setRef(e.target.value)} />
        </FormGrid>
        <div className="mt-3"><TextArea label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
      </Card>

      {type === "PAYMENT" && party?.isVendor && (
        <Card className="mt-3" title="Settle bills (optional)" pad={false}>
          {bills.loading && !bills.data ? <Loading /> : (
            <DataTable dense rows={bills.data} empty="No open bills for this vendor — the payment stays on account." columns={[
              { key: "invoiceNo", header: "Bill" }, { key: "vendorBillNo", header: "Vendor bill" }, { key: "dueDate", header: "Due", render: (r) => dateStr(r.dueDate) }, { key: "remainingAmount", header: "Remaining", type: "money" },
              { key: "pay", header: "Settle now", render: (r) => <div className="w-32"><NumberInput aria-label="Settle amount" value={alloc[r.invoiceId] ?? null} min={0} max={r.remainingAmount} step={1} onValue={(v) => setAlloc({ ...alloc, [r.invoiceId]: v ?? 0 })} /></div> },
            ]} />
          )}
          {settled > (amount ?? 0) && <div className="p-3"><Alert tone="amber">You are settling {money(settled)}, more than the voucher amount {money(amount)}.</Alert></div>}
        </Card>
      )}
      <div className="mt-4 flex gap-2"><Button loading={save.busy} disabled={!amount || (type !== "JOURNAL" && type !== "EXPENSE" && !party)} onClick={() => void save.run()}>Post voucher</Button><Button variant="secondary" onClick={() => router.back()}>Cancel</Button></div>
    </RequirePerm>
  );
}

export function VoucherView({ id }: { id: number }) {
  const { can } = useMe();
  const toast = useToast();
  const [rev, setRev] = useState(0);
  const [open, setOpen] = useState(false);
  const { data, error, loading } = useQuery(() => get<Row>(`/accounting/vouchers/${id}`), [id, rev]);
  const doVoid = useAction(async (reason: string) => { await post(`/accounting/vouchers/${id}/void`, { reason }); toast("Voucher voided — a reversing entry was posted.", "green"); setOpen(false); setRev((r) => r + 1); });
  if (loading && !data) return <Loading />;
  if (error) return <ErrorAlert error={error} />;
  if (!data) return null;
  return (
    <RequirePerm any={ANY}>
      <PageHeader title={`${data.voucherType} voucher #${data.voucherNo}`} subtitle={`${data.store} · ${dateStr(data.voucherDate)}`}
        actions={<>{<Button variant="secondary" icon="print" onClick={() => window.print()}>Print</Button>}{data.status === "POSTED" && can("VOUCHER_DELETE") && <Button variant="danger" onClick={() => setOpen(true)}>Void</Button>}</>} />
      {data.status === "VOID" && <Alert tone="amber">Voided{data.voidReason ? `: ${data.voidReason}` : ""}.</Alert>}
      <ErrorAlert error={doVoid.error} onClose={doVoid.clear} />
      <Card className="print-area">
        <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
          <F k="Amount" v={money(data.amount)} strong /><F k="Debit" v={`${data.debitCode} · ${data.debitName}`} /><F k="Credit" v={`${data.creditCode} · ${data.creditName}`} />
          <F k="Party" v={data.party ?? "—"} /><F k="Mode" v={data.paymentMode ?? "—"} /><F k="Reference" v={data.refNo ?? "—"} /><F k="Description" v={data.description ?? "—"} />
        </dl>
        {(data.allocations as Row[]).length > 0 && (<div className="mt-3 text-[13px]"><div className="font-medium">Settles</div>{(data.allocations as Row[]).map((a) => <div key={a.id}>{a.purchaseInvoiceId ? `Purchase ${a.purchaseInvoiceId}` : a.expenseId ? `Expense ${a.expenseId}` : "Document"} — {money(a.amount)}</div>)}</div>)}
      </Card>
      <ConfirmDialog open={open} title="Void this voucher?" danger confirmLabel="Void" reasonLabel="Reason (required)" message="A reversing entry is posted and any bills it settled become open again." onClose={() => setOpen(false)} onConfirm={(r) => void doVoid.run(r ?? "")} />
    </RequirePerm>
  );
}

function F({ k, v, strong }: { k: string; v: string; strong?: boolean }) { return <div><dt className="text-xs text-muted">{k}</dt><dd className={strong ? "num text-lg font-semibold" : ""}>{v}</dd></div>; }
