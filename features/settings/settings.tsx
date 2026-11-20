"use client";
import { useState } from "react";
import { Alert, Button, Card, ConfirmDialog, ErrorAlert, Loading, Modal, PageHeader, StatusBadge, Tabs, useToast } from "@/components/ui/core";
import { DataTable } from "@/components/ui/data-table";
import { Checkbox, FormGrid, Input, NumberInput, Select, TextArea } from "@/components/ui/form";
import { fieldError } from "@/components/ui/form";
import { MasterSelect } from "@/components/shared/pickers";
import { RequirePerm } from "@/components/session";
import { del, get, post, put, type Row } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";

/** Company profile (owner only) and the list of stores (opening a store creates its stock, cash, sales, cost, loss and salary accounts). */
export function StoresSettings() {
  const toast = useToast();
  const [rev, setRev] = useState(0);
  const company = useQuery(() => get<Row>("/company"), [rev]);
  const stores = useQuery(() => get<Row[]>("/stores", { includeInactive: true }), [rev]);
  const [c, setC] = useState<Row | null>(null);
  const [store, setStore] = useState<Row | null>(null);
  const [seen, setSeen] = useState<Row | null>(null);
  if (company.data && seen !== company.data) { setSeen(company.data); setC(company.data); }   // (re)fill the form when the data arrives

  const saveCompany = useAction(async () => {
    await put("/company", { name: c!.name, legalName: c!.legalName, ntn: c!.ntn, strn: c!.strn, timezone: c!.timezone, roundingMode: c!.roundingMode, priceBandBasis: c!.priceBandBasis, invoiceTerms: c!.invoiceTerms, rowVer: c!.rowVer });
    toast("Company settings saved.", "green"); setC(null); setRev((r) => r + 1);
  });
  const saveStore = useAction(async () => {
    if (store!.id) await put(`/stores/${store!.id}`, { name: store!.name, cityId: store!.cityId, address: store!.address, phone: store!.phone, isActive: store!.isActive, rowVer: store!.rowVer });
    else await post("/stores", { code: store!.code, name: store!.name, cityId: store!.cityId, address: store!.address, phone: store!.phone });
    toast("Store saved.", "green"); setStore(null); setRev((r) => r + 1);
  });

  if (company.loading && !company.data) return <Loading />;
  return (
    <RequirePerm perm="MASTER_EDIT">
      <PageHeader title="Company & stores" />
      <ErrorAlert error={company.error ?? stores.error ?? saveCompany.error} onClose={saveCompany.clear} />
      {c && (
        <Card title="Company">
          <FormGrid cols={3}>
            <Input label="Name" value={c.name ?? ""} onChange={(e) => setC({ ...c, name: e.target.value })} error={fieldError(saveCompany.error, "name")} />
            <Input label="Legal name" value={c.legalName ?? ""} onChange={(e) => setC({ ...c, legalName: e.target.value })} />
            <Input label="Time zone" value={c.timezone ?? ""} onChange={(e) => setC({ ...c, timezone: e.target.value })} error={fieldError(saveCompany.error, "timezone")} />
            <Input label="NTN" value={c.ntn ?? ""} onChange={(e) => setC({ ...c, ntn: e.target.value })} />
            <Input label="STRN" value={c.strn ?? ""} onChange={(e) => setC({ ...c, strn: e.target.value })} />
            <Select label="Rounding of amounts" value={c.roundingMode} onChange={(e) => setC({ ...c, roundingMode: e.target.value })}><option value="FLOOR">Drop the paisa (1039.20 → 1039)</option><option value="NEAREST">Nearest rupee</option></Select>
            <Select label="Price bands use" value={c.priceBandBasis} onChange={(e) => setC({ ...c, priceBandBasis: e.target.value })}><option value="LIST">List price</option><option value="NET">Net price</option></Select>
          </FormGrid>
          <div className="mt-3"><TextArea label="Printed on every receipt (terms)" value={c.invoiceTerms ?? ""} onChange={(e) => setC({ ...c, invoiceTerms: e.target.value })} /></div>
          <p className="mt-2 text-xs text-muted">Only an owner can change these. Currency {c.currencyCode}; plan {c.planCode}.</p>
          <Button className="mt-3" loading={saveCompany.busy} onClick={() => void saveCompany.run()}>Save company</Button>
        </Card>
      )}
      <Card className="mt-4" title="Stores" pad={false} actions={<Button size="sm" onClick={() => setStore({ code: "", name: "", isActive: true })}>Open a store</Button>}>
        <DataTable dense rows={stores.data} loading={stores.loading} columns={[
          { key: "code", header: "Code" }, { key: "name", header: "Name" }, { key: "city", header: "City" }, { key: "phone", header: "Phone" },
          { key: "isActive", header: "Status", render: (r) => <StatusBadge value={r.isActive ? "ACTIVE" : "INACTIVE"} /> },
          { key: "act", header: "", render: (r) => <button className="text-primary-700" onClick={() => setStore(r)}>Edit</button> },
        ]} />
      </Card>
      <Modal open={!!store} title={store?.id ? "Edit store" : "Open a store"} onClose={() => setStore(null)} footer={<Button loading={saveStore.busy} disabled={!store?.name || !store?.code} onClick={() => void saveStore.run()}>Save</Button>}>
        {store && <div className="space-y-3">
          <ErrorAlert error={saveStore.error} onClose={saveStore.clear} />
          <Input label="Code" disabled={!!store.id} value={store.code ?? ""} onChange={(e) => setStore({ ...store, code: e.target.value })} error={fieldError(saveStore.error, "code")} />
          <Input label="Name" value={store.name ?? ""} onChange={(e) => setStore({ ...store, name: e.target.value })} error={fieldError(saveStore.error, "name")} />
          <MasterSelect kind="cities" label="City" value={store.cityId} onChange={(v) => setStore({ ...store, cityId: v })} placeholder="None" />
          <Input label="Address" value={store.address ?? ""} onChange={(e) => setStore({ ...store, address: e.target.value })} />
          <Input label="Phone" value={store.phone ?? ""} onChange={(e) => setStore({ ...store, phone: e.target.value })} />
          {store.id && !store.isHeadOffice && <Checkbox label="Open for business" checked={!!store.isActive} onChange={(e) => setStore({ ...store, isActive: e.target.checked })} />}
        </div>}
      </Modal>
    </RequirePerm>
  );
}

const KINDS: { key: string; label: string }[] = [
  { key: "departments", label: "Departments" }, { key: "categories", label: "Categories" }, { key: "brands", label: "Brands" }, { key: "seasons", label: "Seasons" }, { key: "genders", label: "Genders" },
  { key: "colors", label: "Colours" }, { key: "size-groups", label: "Size groups" }, { key: "sizes", label: "Sizes" }, { key: "product-types", label: "Product types" }, { key: "units", label: "Units" },
  { key: "locations", label: "Locations" }, { key: "cities", label: "Cities" },
];

export function MastersSettings() {
  const [kind, setKind] = useState("departments");
  return (
    <RequirePerm perm="MASTER_EDIT">
      <PageHeader title="Master lists" subtitle="The choices used on products, parties and stores." />
      <div className="mb-3 overflow-x-auto"><Tabs tabs={KINDS} value={kind} onChange={setKind} /></div>
      {kind === "sizes" ? <Sizes /> : <MasterList key={kind} kind={kind} />}
    </RequirePerm>
  );
}

function MasterList({ kind }: { kind: string }) {
  const toast = useToast();
  const [rev, setRev] = useState(0);
  const { data, error, loading } = useQuery(() => get<Row[]>(`/masters/${kind}`, { includeInactive: true }), [kind, rev]);
  const [row, setRow] = useState<Row | null>(null);
  const [gone, setGone] = useState<Row | null>(null);
  const isCat = kind === "categories";
  const save = useAction(async () => {
    const body = { name: row!.name, nameUr: row!.nameUr || undefined, code: row!.code || undefined, sortOrder: Number(row!.sortOrder ?? 0), isActive: row!.isActive !== false, rowVer: row!.rowVer, departmentId: row!.departmentId, parentId: row!.parentId ?? undefined };
    if (row!.id) await put(`/masters/${kind}/${row!.id}`, body); else await post(`/masters/${kind}`, body);
    toast("Saved.", "green"); setRow(null); setRev((r) => r + 1);
  });
  const remove = useAction(async () => { await del(`/masters/${kind}/${gone!.id}`); toast("Removed.", "green"); setGone(null); setRev((r) => r + 1); });
  return (
    <Card pad={false} actions={<Button size="sm" onClick={() => setRow({ name: "", sortOrder: 0, isActive: true })}>Add</Button>}>
      <ErrorAlert error={error ?? remove.error} onClose={remove.clear} />
      <DataTable dense rows={data} loading={loading} columns={[
        { key: "name", header: "Name" }, { key: "nameUr", header: "Urdu" }, ...(isCat ? [{ key: "department", header: "Department" }] : []), { key: "sortOrder", header: "Order", type: "number" as const },
        { key: "isActive", header: "Status", render: (r) => <StatusBadge value={r.isActive ? "ACTIVE" : "INACTIVE"} /> },
        { key: "act", header: "", render: (r) => <span className="flex gap-3"><button className="text-primary-700" onClick={() => setRow(r)}>Edit</button><button className="text-danger-600" onClick={() => setGone(r)}>Remove</button></span> },
      ]} />
      <Modal open={!!row} title={row?.id ? "Edit" : "Add"} onClose={() => setRow(null)} footer={<Button loading={save.busy} disabled={!row?.name} onClick={() => void save.run()}>Save</Button>}>
        {row && <div className="space-y-3">
          <ErrorAlert error={save.error} onClose={save.clear} />
          {isCat && <MasterSelect kind="departments" label="Department" required value={row.departmentId} onChange={(v) => setRow({ ...row, departmentId: v })} />}
          <Input label="Name" value={row.name ?? ""} onChange={(e) => setRow({ ...row, name: e.target.value })} error={fieldError(save.error, "name")} />
          <Input label="Name (Urdu)" dir="rtl" value={row.nameUr ?? ""} onChange={(e) => setRow({ ...row, nameUr: e.target.value })} />
          <Input label="Code" value={row.code ?? ""} onChange={(e) => setRow({ ...row, code: e.target.value })} />
          <NumberInput label="Order" value={row.sortOrder} step={1} onValue={(v) => setRow({ ...row, sortOrder: v ?? 0 })} />
          <Checkbox label="In use" checked={row.isActive !== false} onChange={(e) => setRow({ ...row, isActive: e.target.checked })} />
        </div>}
      </Modal>
      <ConfirmDialog open={!!gone} title={`Remove “${gone?.name}”?`} danger confirmLabel="Remove" message="It disappears from the choices; products already using it keep it." onClose={() => setGone(null)} onConfirm={() => void remove.run()} />
    </Card>
  );
}

function Sizes() {
  const toast = useToast();
  const [rev, setRev] = useState(0);
  const [group, setGroup] = useState<number | null>(null);
  const { data, loading, error } = useQuery(() => get<Row[]>("/masters/sizes", { sizeGroupId: group ?? undefined }), [group, rev]);
  const [code, setCode] = useState("");
  const add = useAction(async () => { await post("/masters/sizes", { sizeGroupId: group, sizeCode: code, sortOrder: ((data ?? []).length + 1) * 10 }); setCode(""); setRev((r) => r + 1); toast("Size added.", "green"); });
  const remove = useAction(async (r: Row) => { await del(`/masters/sizes/${r.id}`); setRev((x) => x + 1); });
  return (
    <Card pad={false}>
      <div className="flex flex-wrap items-end gap-2 border-b border-line p-3">
        <div className="w-56"><MasterSelect kind="size-groups" label="Size group" value={group} onChange={setGroup} placeholder="All groups" /></div>
        <Input aria-label="New size" placeholder="New size…" className="w-32" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button disabled={!group || !code} loading={add.busy} onClick={() => void add.run()}>Add size</Button>
      </div>
      <ErrorAlert error={error ?? add.error ?? remove.error} onClose={() => { add.clear(); remove.clear(); }} />
      {!group && <div className="p-3"><Alert tone="blue">Pick a size group to add sizes to it.</Alert></div>}
      <DataTable dense rows={data} loading={loading} columns={[{ key: "sizeGroup", header: "Group" }, { key: "sizeCode", header: "Size" }, { key: "sortOrder", header: "Order", type: "number" }, { key: "act", header: "", render: (r) => <button className="text-danger-600" onClick={() => void remove.run(r)}>Remove</button> }]} />
    </Card>
  );
}
