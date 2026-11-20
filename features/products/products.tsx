"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ConfirmDialog, ErrorAlert, Loading, Modal, PageHeader, StatusBadge, useToast } from "@/components/ui/core";
import { DataTable } from "@/components/ui/data-table";
import { Checkbox, FormGrid, Input, NumberInput, Select, TextArea } from "@/components/ui/form";
import { fieldError } from "@/components/ui/form";
import { Barcode } from "@/components/shared/barcode";
import { ListPage } from "@/components/shared/list-page";
import { CategorySelect, MasterSelect, StoreSelect } from "@/components/shared/pickers";
import { RequirePerm, useMe } from "@/components/session";
import { del, get, post, put, type Page, type Row } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { money, qty } from "@/lib/format";

const READ = ["SALE_CREATE", "SALE_RETURN", "PURCHASE_CREATE", "STOCK_ADJUST", "STOCK_AUDIT", "MASTER_EDIT", "REPORT_VIEW", "TRANSFER_CREATE", "TRANSFER_RECEIVE"];

export function ProductsList() {
  const router = useRouter();
  const { can } = useMe();
  const [category, setCategory] = useState<number | null>(null);
  return (
    <RequirePerm any={READ}>
      <ListPage title="Products" subtitle="Search by name, code or barcode." endpoint="/catalog/products" query={{ categoryId: category }}
        actions={can("MASTER_EDIT") ? <Button onClick={() => router.push("/products/new")}>New product</Button> : undefined}
        filters={<div className="w-48"><CategorySelect label="" value={category} onChange={setCategory} /></div>}
        onRow={(r) => router.push(`/products/${r.id}`)}
        columns={[
          { key: "code", header: "Code" }, { key: "name", header: "Name" }, { key: "category", header: "Category" }, { key: "brand", header: "Brand" },
          { key: "variantCount", header: "Sizes", type: "number" },
          { key: "minPrice", header: "Price", render: (r) => <span className="num">{money(r.minPrice)}{r.maxPrice !== r.minPrice ? ` – ${money(r.maxPrice)}` : ""}</span>, align: "right" },
          { key: "stockQty", header: "Stock", type: "number" }, { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]} />
    </RequirePerm>
  );
}

type Var = { key: number; sizeCode: string; barcode: string; purchasePrice: number; salePrice: number };
let seq = 1;

/** New product with its sizes, or (with `productId`) the product's own fields. Sizes of an existing product are managed on its page. */
export function ProductForm({ productId }: { productId?: number }) {
  const router = useRouter();
  const toast = useToast();
  const existing = useQuery(() => get<Row>(`/catalog/products/${productId}`), [productId], { skip: !productId });
  const [f, setF] = useState<Row>({ name: "", code: "", nameUr: "", departmentId: null, categoryId: null, brandId: null, seasonId: null, genderId: null, productTypeId: null, unitId: null, taxRate: 0, status: "ACTIVE", description: "" });
  const [colorId, setColorId] = useState<number | null>(null);
  const [sizeGroupId, setSizeGroupId] = useState<number | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [vars, setVars] = useState<Var[]>([]);
  const sizes = useQuery(() => get<Row[]>("/masters/sizes", { sizeGroupId }), [sizeGroupId], { skip: !sizeGroupId });
  const [loaded, setLoaded] = useState<Row | null>(null);
  if (existing.data && loaded !== existing.data) { setLoaded(existing.data); setF(existing.data); }   // fill the form once when the data arrives
  const set = (patch: Row) => setF((x) => ({ ...x, ...patch }));

  const save = useAction(async () => {
    const body = {
      code: f.code || undefined, name: f.name, nameUr: f.nameUr || undefined, departmentId: f.departmentId, categoryId: f.categoryId, brandId: f.brandId, seasonId: f.seasonId, genderId: f.genderId,
      productTypeId: f.productTypeId, unitId: f.unitId, description: f.description || undefined, taxRate: Number(f.taxRate ?? 0), status: f.status, rowVer: productId ? f.rowVer : undefined,
      variants: productId ? undefined : vars.map((v) => ({ colorId, sizeGroupId, sizeCode: v.sizeCode, barcode: v.barcode || undefined, purchasePrice: v.purchasePrice, salePrice: v.salePrice })),
    };
    if (productId) { await put(`/catalog/products/${productId}`, body); toast("Product saved.", "green"); router.push(`/products/${productId}`); }
    else { const r = await post<{ id: number }>("/catalog/products", body); toast("Product created.", "green"); router.push(`/products/${r.id}`); }
  });

  const addSize = (code: string) => setVars((vs) => (vs.some((v) => v.sizeCode === code) ? vs : [...vs, { key: seq++, sizeCode: code, barcode: "", purchasePrice: cost ?? 0, salePrice: price ?? 0 }]));

  if (productId && existing.loading && !existing.data) return <Loading />;
  return (
    <RequirePerm perm="MASTER_EDIT">
      <PageHeader title={productId ? "Edit product" : "New product"} />
      <ErrorAlert error={save.error ?? existing.error} onClose={save.clear} />
      <form onSubmit={(e) => { e.preventDefault(); void save.run(); }} className="space-y-4">
        <Card title="Article">
          <FormGrid cols={3}>
            <Input label="Name" required value={f.name ?? ""} onChange={(e) => set({ name: e.target.value })} error={fieldError(save.error, "name")} />
            <Input label="Code" value={f.code ?? ""} onChange={(e) => set({ code: e.target.value })} hint="Leave empty for an automatic code." error={fieldError(save.error, "code")} />
            <Input label="Name (Urdu)" dir="rtl" value={f.nameUr ?? ""} onChange={(e) => set({ nameUr: e.target.value })} />
            <MasterSelect kind="departments" label="Department" required value={f.departmentId} onChange={(v) => set({ departmentId: v, categoryId: null })} error={fieldError(save.error, "departmentId")} />
            <CategorySelect label="Category" required value={f.categoryId} departmentId={f.departmentId} onChange={(v) => set({ categoryId: v })} error={fieldError(save.error, "categoryId")} />
            <MasterSelect kind="brands" label="Brand / company" value={f.brandId} onChange={(v) => set({ brandId: v })} placeholder="None" />
            <MasterSelect kind="seasons" label="Season" value={f.seasonId} onChange={(v) => set({ seasonId: v })} placeholder="None" />
            <MasterSelect kind="genders" label="Gender" value={f.genderId} onChange={(v) => set({ genderId: v })} placeholder="None" />
            <MasterSelect kind="product-types" label="Type" value={f.productTypeId} onChange={(v) => set({ productTypeId: v })} placeholder="None" />
            <NumberInput label="Tax rate %" value={f.taxRate} min={0} max={100} step={0.01} onValue={(v) => set({ taxRate: v ?? 0 })} hint="0 = no tax. Prices are tax-exclusive." error={fieldError(save.error, "taxRate")} />
            <Select label="Status" value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select>
          </FormGrid>
          <div className="mt-3"><TextArea label="Description" value={f.description ?? ""} onChange={(e) => set({ description: e.target.value })} /></div>
        </Card>

        {!productId && (
          <Card title="Sizes & prices">
            <FormGrid cols={4}>
              <MasterSelect kind="colors" label="Colour" value={colorId} onChange={setColorId} placeholder="No colour" />
              <MasterSelect kind="size-groups" label="Size group" value={sizeGroupId} onChange={setSizeGroupId} />
              <NumberInput label="Cost (all sizes)" value={cost} min={0} step={1} onValue={(v) => { setCost(v); setVars((vs) => vs.map((x) => ({ ...x, purchasePrice: v ?? 0 }))); }} />
              <NumberInput label="Sale price (all sizes)" value={price} min={0} step={1} onValue={(v) => { setPrice(v); setVars((vs) => vs.map((x) => ({ ...x, salePrice: v ?? 0 }))); }} />
            </FormGrid>
            {sizeGroupId && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(sizes.data ?? []).map((s) => (
                  <button type="button" key={s.id} onClick={() => addSize(s.sizeCode)} className="rounded border border-line-strong px-2.5 py-1 text-[13px] hover:bg-primary-50">{s.sizeCode}</button>
                ))}
                {(sizes.data ?? []).length === 0 && <span className="text-xs text-muted">This group has no sizes yet — add them under Master Lists.</span>}
              </div>
            )}
            <div className="mt-3 flex gap-2"><Input aria-label="Other size" placeholder="Other size…" id="other-size" className="w-40" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = e.currentTarget.value.trim(); if (t) { addSize(t); e.currentTarget.value = ""; } } }} /></div>
            {vars.length > 0 && (
              <table className="mt-3 w-full text-[13px]">
                <thead><tr className="text-left text-xs uppercase text-muted"><th>Size</th><th>Barcode</th><th>Cost</th><th>Sale price</th><th /></tr></thead>
                <tbody>{vars.map((v) => (
                  <tr key={v.key} className="border-t border-line">
                    <td className="py-1.5 font-medium">{v.sizeCode}</td>
                    <td className="w-56 pr-2"><Input aria-label="Barcode" placeholder="Automatic" value={v.barcode} onChange={(e) => setVars(vars.map((x) => (x.key === v.key ? { ...x, barcode: e.target.value } : x)))} /></td>
                    <td className="w-28 pr-2"><NumberInput aria-label="Cost" value={v.purchasePrice} min={0} step={1} onValue={(n) => setVars(vars.map((x) => (x.key === v.key ? { ...x, purchasePrice: n ?? 0 } : x)))} /></td>
                    <td className="w-28 pr-2"><NumberInput aria-label="Sale price" value={v.salePrice} min={0} step={1} onValue={(n) => setVars(vars.map((x) => (x.key === v.key ? { ...x, salePrice: n ?? 0 } : x)))} /></td>
                    <td><button type="button" className="text-xs text-danger-600" onClick={() => setVars(vars.filter((x) => x.key !== v.key))}>Remove</button></td>
                  </tr>))}</tbody>
              </table>
            )}
          </Card>
        )}
        <div className="flex gap-2"><Button type="submit" loading={save.busy} disabled={!f.name || !f.departmentId || !f.categoryId}>Save</Button><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button></div>
      </form>
    </RequirePerm>
  );
}

/** One product: its sizes with prices and stock per store, price changes, store prices, history. */
export function ProductView({ id }: { id: number }) {
  const { can, me } = useMe();
  const router = useRouter();
  const toast = useToast();
  const [rev, setRev] = useState(0);
  const { data, error, loading } = useQuery(() => get<Row>(`/catalog/products/${id}`), [id, rev]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [history, setHistory] = useState<number | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [newSize, setNewSize] = useState<{ sizeCode: string; purchasePrice: number; salePrice: number } | null>(null);
  const canEdit = can("MASTER_EDIT");

  const savePrice = useAction(async (v: Row, purchase: number, sale: number) => {
    await put(`/catalog/variants/${v.id}/prices`, { purchasePrice: purchase, salePrice: sale, reason: "Edited on the product page" });
    toast("Prices saved.", "green"); setEdit(null); setRev((r) => r + 1);
  });
  const addSize = useAction(async () => {
    if (!newSize) return;
    await post(`/catalog/products/${id}/variants`, { sizeCode: newSize.sizeCode, purchasePrice: newSize.purchasePrice, salePrice: newSize.salePrice, colorId: data?.variants?.[0]?.colorId, sizeGroupId: data?.variants?.[0]?.sizeGroupId });
    setNewSize(null); setRev((r) => r + 1);
  });
  const removeSize = useAction(async (v: Row) => { await del(`/catalog/variants/${v.id}`); setRev((r) => r + 1); });
  const removeProduct = useAction(async () => { await del(`/catalog/products/${id}`); toast("Product removed.", "green"); router.push("/products"); });

  if (loading && !data) return <Loading />;
  if (error) return <ErrorAlert error={error} />;
  if (!data) return null;
  const vars = (data.variants ?? []) as Row[];
  return (
    <RequirePerm any={READ}>
      <PageHeader title={data.name} subtitle={`${data.code} · ${data.category}${data.brand ? ` · ${data.brand}` : ""}`}
        actions={canEdit ? <><Button variant="secondary" onClick={() => router.push(`/products/${id}/edit`)}>Edit details</Button><Button variant="danger" onClick={() => setDelOpen(true)}>Remove</Button></> : undefined} />
      <ErrorAlert error={savePrice.error ?? addSize.error ?? removeSize.error ?? removeProduct.error} onClose={() => { savePrice.clear(); addSize.clear(); removeSize.clear(); removeProduct.clear(); }} />
      <Card title={`Sizes (${vars.length}) · total stock ${qty(data.stockQty)}`} pad={false}
        actions={canEdit ? <Button size="sm" onClick={() => setNewSize({ sizeCode: "", purchasePrice: vars[0]?.purchasePrice ?? 0, salePrice: vars[0]?.salePrice ?? 0 })}>Add size</Button> : undefined}>
        <DataTable dense rows={vars} columns={[
          { key: "sizeCode", header: "Size", render: (v) => <b>{v.sizeCode}</b> }, { key: "color", header: "Colour" },
          { key: "barcode", header: "Barcode", render: (v) => <Barcode value={v.barcode} height={26} unit={1} /> },
          { key: "purchasePrice", header: "Cost", type: "money" }, { key: "salePrice", header: "Sale price", type: "money" },
          { key: "stockQty", header: "Stock", type: "number" },
          { key: "stores", header: "By store", render: (v) => <span className="text-xs text-muted">{((v.stockByStore ?? []) as Row[]).map((s) => `${me.stores.find((x) => x.id === s.storeId)?.name ?? s.storeId}: ${qty(s.qty)}`).join(" · ")}</span> },
          { key: "act", header: "", render: (v) => (
            <span className="flex gap-2 whitespace-nowrap">
              <button className="text-primary-700" onClick={() => setHistory(v.id)}>History</button>
              {canEdit && <button className="text-primary-700" onClick={() => setEdit({ ...v, purchase: v.purchasePrice, sale: v.salePrice })}>Prices</button>}
              {canEdit && <button className="text-danger-600" onClick={() => void removeSize.run(v)}>Remove</button>}
            </span>) },
        ]} />
      </Card>

      <Modal open={!!edit} title={`Prices — size ${edit?.sizeCode ?? ""}`} onClose={() => setEdit(null)}
        footer={<Button loading={savePrice.busy} onClick={() => edit && void savePrice.run(edit, Number(edit.purchase), Number(edit.sale))}>Save</Button>}>
        {edit && <div className="space-y-3">
          <NumberInput label="Cost price" value={edit.purchase} min={0} step={1} onValue={(v) => setEdit({ ...edit, purchase: v ?? 0 })} />
          <NumberInput label="Sale price" value={edit.sale} min={0} step={1} onValue={(v) => setEdit({ ...edit, sale: v ?? 0 })} />
          <StorePrice variantId={edit.id} />
        </div>}
      </Modal>
      <Modal open={!!newSize} title="Add a size" onClose={() => setNewSize(null)} footer={<Button loading={addSize.busy} disabled={!newSize?.sizeCode} onClick={() => void addSize.run()}>Add</Button>}>
        {newSize && <div className="space-y-3">
          <Input label="Size" value={newSize.sizeCode} onChange={(e) => setNewSize({ ...newSize, sizeCode: e.target.value })} />
          <NumberInput label="Cost price" value={newSize.purchasePrice} min={0} step={1} onValue={(v) => setNewSize({ ...newSize, purchasePrice: v ?? 0 })} />
          <NumberInput label="Sale price" value={newSize.salePrice} min={0} step={1} onValue={(v) => setNewSize({ ...newSize, salePrice: v ?? 0 })} />
        </div>}
      </Modal>
      <HistoryModal variantId={history} onClose={() => setHistory(null)} />
      <ConfirmDialog open={delOpen} title="Remove this product?" danger confirmLabel="Remove" message="It is hidden from sales and lists; its history stays. Refused while any size still has stock." onClose={() => setDelOpen(false)} onConfirm={() => void removeProduct.run()} />
    </RequirePerm>
  );
}

function StorePrice({ variantId }: { variantId: number }) {
  const { me } = useMe();
  const toast = useToast();
  const [store, setStore] = useState<number | null>(me.stores.find((s) => !s.isHeadOffice)?.id ?? null);
  const [p, setP] = useState<number | null>(null);
  const set = useAction(async (clear: boolean) => {
    await put(`/catalog/variants/${variantId}/store-price`, { storeId: store, salePrice: clear ? null : p });
    toast(clear ? "Store price cleared." : "Store price saved.", "green");
  });
  return (
    <div className="rounded-md border border-line p-3">
      <div className="mb-2 text-[13px] font-medium">A different price in one store</div>
      <ErrorAlert error={set.error} onClose={set.clear} />
      <div className="grid grid-cols-2 gap-2"><StoreSelect label="Store" value={store} onChange={setStore} /><NumberInput label="Price" value={p} min={0} step={1} onValue={setP} /></div>
      <div className="mt-2 flex gap-2"><Button size="sm" disabled={!store || p === null} loading={set.busy} onClick={() => void set.run(false)}>Set</Button><Button size="sm" variant="secondary" disabled={!store} onClick={() => void set.run(true)}>Clear</Button></div>
    </div>
  );
}

function HistoryModal({ variantId, onClose }: { variantId: number | null; onClose: () => void }) {
  const { data } = useQuery(() => get<Row[]>("/catalog/price-history", { variantId: variantId ?? undefined, limit: 50 }), [variantId], { skip: !variantId });
  return (
    <Modal open={!!variantId} title="Price history" onClose={onClose} wide>
      <DataTable dense rows={data} columns={[
        { key: "changedAt", header: "When", type: "datetime" }, { key: "priceType", header: "Price" }, { key: "storeId", header: "Store", render: (r) => (r.storeId === 0 ? "All" : r.storeId) },
        { key: "oldPrice", header: "Old", type: "money" }, { key: "newPrice", header: "New", type: "money" }, { key: "reason", header: "Reason" },
      ]} />
    </Modal>
  );
}

export function StockList() {
  const { me } = useMe();
  const [store, setStore] = useState<number | null>(null);
  const [onlyPositive, setOnly] = useState(true);
  const { data } = useQuery(() => get<Page<Row>>("/stock", { storeId: store ?? undefined, onlyPositive, pageSize: 1 }), [store, onlyPositive]);
  return (
    <RequirePerm any={READ}>
      <ListPage title="Stock" subtitle={`${data ? `${data.total} lines` : ""} · stock you may see`} endpoint="/stock" query={{ storeId: store, onlyPositive }}
        filters={<>{me.stores.length > 2 && <div className="w-44"><StoreSelect all label="" value={store} onChange={setStore} /></div>}<Checkbox label="Only in stock" checked={onlyPositive} onChange={(e) => setOnly(e.target.checked)} /></>}
        columns={[
          { key: "store", header: "Store" }, { key: "productCode", header: "Code" }, { key: "productName", header: "Item" }, { key: "color", header: "Colour" }, { key: "sizeCode", header: "Size" },
          { key: "barcode", header: "Barcode" }, { key: "qtyOnHand", header: "On hand", type: "number" }, { key: "avgCost", header: "Avg cost", type: "number" }, { key: "stockValue", header: "Value", type: "money" },
        ]} />
    </RequirePerm>
  );
}

