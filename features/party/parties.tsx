"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, ConfirmDialog, ErrorAlert, Loading, PageHeader, StatusBadge, Tabs, useToast } from "@/components/ui/core";
import { DataTable } from "@/components/ui/data-table";
import { Checkbox, FormGrid, Input, NumberInput, Select } from "@/components/ui/form";
import { fieldError } from "@/components/ui/form";
import { ListPage } from "@/components/shared/list-page";
import { MasterSelect, StoreSelect } from "@/components/shared/pickers";
import { RequirePerm, useMe } from "@/components/session";
import { del, get, post, put, type Row } from "@/lib/api";
import { useAction, useParam, useQuery } from "@/lib/hooks";
import { dateStr, money, monthStart, today } from "@/lib/format";

type Kind = "customer" | "vendor" | "staff";
const KINDS: Kind[] = ["customer", "vendor", "staff"];
const TITLE: Record<Kind, string> = { customer: "Customers", vendor: "Vendors", staff: "Staff" };
const READ: Record<Kind, string[]> = {
  customer: ["SALE_CREATE", "SALE_RETURN", "VOUCHER_POST", "MASTER_EDIT", "REPORT_VIEW"],
  vendor: ["PURCHASE_CREATE", "PURCHASE_PAY", "VENDOR_MANAGE", "VOUCHER_POST", "REPORT_VIEW"],
  staff: ["USER_ADMIN", "PAYROLL_PREPARE", "PAYROLL_APPROVE", "MASTER_EDIT"],
};

export function PartiesList() {
  const router = useRouter();
  const { can } = useMe();
  const [k] = useParam("kind");
  const kind: Kind = KINDS.includes(k as Kind) ? (k as Kind) : "customer";
  const [withBalance, setWithBalance] = useState(false);
  const canAdd = kind === "vendor" ? can("VENDOR_MANAGE") : kind === "staff" ? can("USER_ADMIN") || can("PAYROLL_PREPARE") || can("MASTER_EDIT") : can("MASTER_EDIT") || can("SALE_CREATE");
  return (
    <RequirePerm any={READ[kind]}>
      <ListPage title={TITLE[kind]} subtitle={kind === "vendor" ? "A negative balance is what you owe the vendor." : kind === "customer" ? "A positive balance is what the customer owes you." : "Employees."}
        endpoint="/parties" query={{ [kind]: true, onlyWithBalance: withBalance }} actions={canAdd ? <Button onClick={() => router.push(`/parties/new?kind=${kind}`)}>New {kind}</Button> : undefined}
        filters={kind !== "staff" ? <Checkbox label="Only with a balance" checked={withBalance} onChange={(e) => setWithBalance(e.target.checked)} /> : undefined}
        onRow={(r) => router.push(`/parties/${r.id}`)}
        columns={[
          { key: "code", header: "Code" }, { key: "name", header: "Name" }, { key: "phonePrimary", header: "Phone" }, { key: "city", header: "City" },
          ...(kind === "vendor" ? [{ key: "creditLimit", header: "Credit limit", type: "money" as const }] : []),
          ...(kind !== "staff" ? [{ key: "balance", header: kind === "vendor" ? "Balance (− you owe)" : "Balance", type: "money" as const }] : []),
          { key: "status", header: "Status", render: (r: Row) => <StatusBadge value={r.status} /> },
        ]} />
    </RequirePerm>
  );
}

export function PartyForm({ partyId }: { partyId?: number }) {
  const router = useRouter();
  const toast = useToast();
  const { me } = useMe();
  const [k] = useParam("kind");
  const existing = useQuery(() => get<Row>(`/parties/${partyId}`), [partyId], { skip: !partyId });
  const [f, setF] = useState<Row>({ name: "", nameUr: "", fatherName: "", cnic: "", phonePrimary: "", phoneSecondary: "", email: "", address: "", cityId: null, isCustomer: k === "customer" || !k, isVendor: k === "vendor", isStaff: k === "staff", creditLimit: null, status: "ACTIVE" });
  const [staff, setStaff] = useState<Row>({ designation: "", isManager: false, baseSalary: 0, payFrequency: "MONTHLY", storeId: me.currentStore.isHeadOffice ? null : me.currentStore.id });
  const [loaded, setLoaded] = useState<Row | null>(null);
  if (existing.data && loaded !== existing.data) {   // fill the form once when the data arrives
    setLoaded(existing.data); setF(existing.data);
    if (existing.data.staff) setStaff({ ...existing.data.staff, storeId: existing.data.staff.currentStoreId });
  }
  const set = (p: Row) => setF((x) => ({ ...x, ...p }));

  const save = useAction(async () => {
    const body = { ...f, staff: f.isStaff ? { designation: staff.designation || undefined, isManager: !!staff.isManager, baseSalary: Number(staff.baseSalary ?? 0), payFrequency: staff.payFrequency, storeId: staff.storeId } : undefined };
    if (partyId) { await put(`/parties/${partyId}`, body); toast("Saved.", "green"); router.push(`/parties/${partyId}`); }
    else { const r = await post<{ id: number }>("/parties", body); toast("Created.", "green"); router.push(`/parties/${r.id}`); }
  });
  if (partyId && existing.loading && !existing.data) return <Loading />;
  return (
    <RequirePerm any={[...READ.customer, ...READ.vendor, ...READ.staff]}>
      <PageHeader title={partyId ? "Edit party" : "New party"} />
      <ErrorAlert error={save.error ?? existing.error} onClose={save.clear} />
      <form onSubmit={(e) => { e.preventDefault(); void save.run(); }} className="space-y-4">
        <Card>
          <div className="mb-3 flex flex-wrap gap-4"><Checkbox label="Customer" checked={!!f.isCustomer} onChange={(e) => set({ isCustomer: e.target.checked })} /><Checkbox label="Vendor" checked={!!f.isVendor} onChange={(e) => set({ isVendor: e.target.checked })} /><Checkbox label="Staff" checked={!!f.isStaff} onChange={(e) => set({ isStaff: e.target.checked })} /></div>
          <FormGrid cols={3}>
            <Input label="Name" required value={f.name ?? ""} onChange={(e) => set({ name: e.target.value })} error={fieldError(save.error, "name")} />
            <Input label="Name (Urdu)" dir="rtl" value={f.nameUr ?? ""} onChange={(e) => set({ nameUr: e.target.value })} />
            <Input label="Father's name" value={f.fatherName ?? ""} onChange={(e) => set({ fatherName: e.target.value })} />
            <Input label="CNIC" placeholder="35202-1234567-1" value={f.cnic ?? ""} onChange={(e) => set({ cnic: e.target.value })} error={fieldError(save.error, "cnic")} />
            <Input label="Phone" value={f.phonePrimary ?? ""} onChange={(e) => set({ phonePrimary: e.target.value })} />
            <Input label="Second phone" value={f.phoneSecondary ?? ""} onChange={(e) => set({ phoneSecondary: e.target.value })} />
            <Input label="Email" type="email" value={f.email ?? ""} onChange={(e) => set({ email: e.target.value })} error={fieldError(save.error, "email")} />
            <MasterSelect kind="cities" label="City" value={f.cityId} onChange={(v) => set({ cityId: v })} placeholder="None" />
            <Select label="Status" value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select>
            <Input className="sm:col-span-3" label="Address" value={f.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
            {f.isVendor && <NumberInput label="Credit limit (open bills)" value={f.creditLimit} min={0} step={1} onValue={(v) => set({ creditLimit: v })} hint="Empty = no limit." />}
          </FormGrid>
        </Card>
        {f.isStaff && (
          <Card title="Employee">
            <FormGrid cols={4}>
              <Input label="Designation" value={staff.designation ?? ""} onChange={(e) => setStaff({ ...staff, designation: e.target.value })} />
              <NumberInput label="Base salary" value={staff.baseSalary} min={0} step={1} onValue={(v) => setStaff({ ...staff, baseSalary: v ?? 0 })} />
              <Select label="Paid" value={staff.payFrequency} onChange={(e) => setStaff({ ...staff, payFrequency: e.target.value })}><option value="MONTHLY">Monthly</option><option value="BIWEEKLY">Every two weeks</option><option value="WEEKLY">Weekly</option></Select>
              <StoreSelect label="Works in" value={staff.storeId} onChange={(v) => setStaff({ ...staff, storeId: v })} />
            </FormGrid>
            <div className="mt-2"><Checkbox label="Store manager (earns manager commission)" checked={!!staff.isManager} onChange={(e) => setStaff({ ...staff, isManager: e.target.checked })} /></div>
          </Card>
        )}
        <div className="flex gap-2"><Button type="submit" loading={save.busy} disabled={!f.name}>Save</Button><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button></div>
      </form>
    </RequirePerm>
  );
}

/** One party: details, balance and the ledger (every posting on their account with a running balance). */
export function PartyView({ id }: { id: number }) {
  const router = useRouter();
  const { can } = useMe();
  const toast = useToast();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [tab, setTab] = useState("ledger");
  const [delOpen, setDelOpen] = useState(false);
  const { data, error, loading } = useQuery(() => get<Row>(`/accounting/parties/${id}/ledger`, { from, to }), [id, from, to]);
  const party = useQuery(() => get<Row>(`/parties/${id}`), [id]);
  const remove = useAction(async () => { await del(`/parties/${id}`); toast("Removed.", "green"); router.push("/parties"); });
  const p = party.data;
  if (party.loading && !p) return <Loading />;
  if (!p) return <ErrorAlert error={party.error ?? error} />;
  const kind: Kind = p.isVendor ? "vendor" : p.isStaff && !p.isCustomer ? "staff" : "customer";
  return (
    <RequirePerm any={[...READ.customer, ...READ.vendor, ...READ.staff]}>
      <PageHeader title={p.name} subtitle={`${p.code}${p.phonePrimary ? ` · ${p.phonePrimary}` : ""}${p.city ? ` · ${p.city}` : ""}`}
        actions={<>
          <Link href={`/parties/${id}/edit`}><Button variant="secondary">Edit</Button></Link>
          {p.isCustomer && can("VOUCHER_POST") && <Link href={`/vouchers/new?type=RECEIPT&partyId=${id}`}><Button variant="secondary">Receive payment</Button></Link>}
          {p.isVendor && (can("VOUCHER_POST") || can("PURCHASE_PAY")) && <Link href={`/vouchers/new?type=PAYMENT&partyId=${id}`}><Button>Pay vendor</Button></Link>}
          {can("MASTER_EDIT") && p.code !== "WALKIN" && <Button variant="danger" onClick={() => setDelOpen(true)}>Remove</Button>}
        </>} />
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><div className="text-xs text-muted">{kind === "vendor" ? "We owe (−)" : "Balance"}</div><div className="num text-xl font-semibold">{money(p.balance)}</div></Card>
        {p.creditLimit != null && <Card><div className="text-xs text-muted">Credit limit</div><div className="num text-xl">{money(p.creditLimit)}</div></Card>}
        {p.staff && <Card><div className="text-xs text-muted">Salary · store</div><div>{money(p.staff.baseSalary)} · {p.staff.currentStore}</div></Card>}
      </div>
      <Tabs tabs={[{ key: "ledger", label: "Ledger" }, ...(kind === "vendor" ? [{ key: "bills", label: "Open bills" }] : [])]} value={tab} onChange={setTab} />
      <ErrorAlert error={remove.error} onClose={remove.clear} />
      {tab === "ledger" ? (
        <Card className="mt-3" pad={false}>
          <div className="no-print flex flex-wrap items-end gap-2 border-b border-line p-3"><Input aria-label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /><Input aria-label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /><Button variant="secondary" icon="print" onClick={() => window.print()}>Print</Button></div>
          {loading && !data ? <Loading /> : data && (
            <>
              <div className="grid grid-cols-4 gap-2 border-b border-line p-3 text-[13px]"><F k="Opening" v={money(data.opening)} /><F k="Debit" v={money(data.totalDebit)} /><F k="Credit" v={money(data.totalCredit)} /><F k="Closing" v={money(data.closing)} /></div>
              <DataTable dense rows={data.lines as Row[]} rowKey={(_, i) => i} columns={[
                { key: "entryDate", header: "Date", type: "date" }, { key: "sourceType", header: "Type" }, { key: "description", header: "Description" },
                { key: "debit", header: "Debit", type: "money" }, { key: "credit", header: "Credit", type: "money" }, { key: "running", header: "Balance", type: "money" },
              ]} />
            </>
          )}
        </Card>
      ) : <OpenBills vendorId={id} />}
      <ConfirmDialog open={delOpen} title="Remove this party?" danger confirmLabel="Remove" message="Refused while the account has a balance." onClose={() => setDelOpen(false)} onConfirm={() => void remove.run()} />
    </RequirePerm>
  );
}

function F({ k, v }: { k: string; v: string }) { return <div><div className="text-xs text-muted">{k}</div><div className="num font-medium">{v}</div></div>; }

function OpenBills({ vendorId }: { vendorId: number }) {
  const { data, loading } = useQuery(() => get<Row[]>(`/accounting/vendors/${vendorId}/open-bills`), [vendorId]);
  return (
    <Card className="mt-3" pad={false}>
      <DataTable loading={loading} rows={data} empty="No open bills." columns={[
        { key: "invoiceNo", header: "No." }, { key: "vendorBillNo", header: "Vendor bill" }, { key: "billDate", header: "Date", render: (r) => dateStr(r.billDate) },
        { key: "dueDate", header: "Due", render: (r) => dateStr(r.dueDate) }, { key: "netAmount", header: "Bill", type: "money" }, { key: "paidAmount", header: "Paid", type: "money" }, { key: "remainingAmount", header: "Remaining", type: "money" },
      ]} />
    </Card>
  );
}
