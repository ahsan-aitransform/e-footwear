"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ConfirmDialog, ErrorAlert, Loading, Modal, PageHeader, StatusBadge, useToast } from "@/components/ui/core";
import { Checkbox, FormGrid, Input, Select } from "@/components/ui/form";
import { fieldError } from "@/components/ui/form";
import { ListPage } from "@/components/shared/list-page";
import { RequirePerm, useMe } from "@/components/session";
import { get, post, put, type Row } from "@/lib/api";
import { useAction, useQuery } from "@/lib/hooks";
import { dateTimeStr } from "@/lib/format";

export function UsersList() {
  const router = useRouter();
  const toast = useToast();
  const { me } = useMe();
  const [rev, setRev] = useState(0);
  const [reset, setReset] = useState<Row | null>(null);
  const [block, setBlock] = useState<Row | null>(null);
  const status = useAction(async (u: Row, to: "ACTIVE" | "DISABLED") => { await post(`/users/${u.id}/status`, { status: to }); toast(to === "DISABLED" ? "User blocked — signed out at once." : "User unblocked.", "green"); setBlock(null); setRev((r) => r + 1); });
  return (
    <RequirePerm perm="USER_ADMIN">
      <ListPage title="Users" subtitle="Each user has their own permissions and stores. Blocking applies on the next click." endpoint="/users" reloadKey={rev}
        actions={<Button onClick={() => router.push("/users/new")}>New user</Button>}
        columns={[
          { key: "username", header: "User name" }, { key: "fullName", header: "Name" }, { key: "roleCode", header: "Role", render: (r) => r.roleCode.replace(/_/g, " ") },
          { key: "stores", header: "Stores", render: (r) => (r.allStores ? "All" : ((r.stores ?? []) as number[]).map((s) => me.stores.find((x) => x.id === s)?.name ?? s).join(", ")) },
          { key: "lastLoginAt", header: "Last sign-in", type: "datetime" }, { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "act", header: "", render: (r) => (
            <span className="flex gap-3 whitespace-nowrap">
              <button className="text-primary-700" onClick={() => router.push(`/users/${r.id}`)}>Edit</button>
              <button className="text-primary-700" onClick={() => setReset(r)}>Reset password</button>
              {r.id !== me.userId && (r.status === "ACTIVE" ? <button className="text-danger-600" onClick={() => setBlock(r)}>Block</button> : <button className="text-primary-700" onClick={() => void status.run(r, "ACTIVE")}>Unblock</button>)}
            </span>) },
        ]} />
      <ErrorAlert error={status.error} onClose={status.clear} />
      <ResetPassword user={reset} onClose={() => setReset(null)} />
      <ConfirmDialog open={!!block} title={`Block ${block?.username}?`} danger confirmLabel="Block" message="Every session of this user ends immediately." onClose={() => setBlock(null)} onConfirm={() => { if (block) void status.run(block, "DISABLED"); }} />
    </RequirePerm>
  );
}

function ResetPassword({ user, onClose }: { user: Row | null; onClose: () => void }) {
  const toast = useToast();
  const [pw, setPw] = useState("");
  const save = useAction(async () => { await post(`/users/${user!.id}/reset-password`, { temporaryPassword: pw }); toast("Temporary password set. The user must change it at the next sign-in.", "green"); setPw(""); onClose(); });
  return (
    <Modal open={!!user} title={`Reset password — ${user?.username ?? ""}`} onClose={onClose} footer={<Button loading={save.busy} disabled={pw.length < 8} onClick={() => void save.run()}>Set temporary password</Button>}>
      <ErrorAlert error={save.error} onClose={save.clear} />
      <Input label="Temporary password" type="text" value={pw} onChange={(e) => setPw(e.target.value)} hint="At least 8 characters with letters and digits. Tell the user in person." error={fieldError(save.error, "newPassword")} />
    </Modal>
  );
}

const GROUP: Record<string, string> = { SALE: "Sales", PRICE: "Sales", DISCOUNT: "Sales", PROMO: "Promotions", PURCHASE: "Purchases", VENDOR: "Purchases", STOCK: "Stock", TRANSFER: "Stock", CLAIM: "Stock",
  VOUCHER: "Money", EXPENSE: "Money", OPENING: "Money", CASH: "Money", PAYROLL: "People", COMMISSION: "People", REPORT: "Reports", MASTER: "Settings", USER: "Users", LOGIN: "Users", SHOPIFY: "Settings", SYNC: "Settings" };

export function UserForm({ userId }: { userId?: number }) {
  const router = useRouter();
  const toast = useToast();
  const { me } = useMe();
  const meta = useQuery(() => get<Row>("/users/meta"), []);
  const existing = useQuery(() => get<Row>(`/users/${userId}`), [userId], { skip: !userId });
  const [f, setF] = useState<Row>({ userName: "", fullName: "", role: "CASHIER_SALESMAN", password: "", allStores: false });
  const [stores, setStores] = useState<number[]>([]);
  const [perms, setPerms] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<Row | null>(null);
  if (existing.data && loaded !== existing.data) {   // fill the form once when the data arrives
    const u = existing.data;
    setLoaded(u); setF({ userName: u.username, fullName: u.fullName, role: u.roleCode, allStores: u.allStores }); setStores(u.stores ?? []); setPerms(u.permissions ?? []);
  }

  const grouped = useMemo(() => {
    const g = new Map<string, Row[]>();
    for (const p of (meta.data?.permissions ?? []) as Row[]) { const k = GROUP[String(p.code).split("_")[0]] ?? "Other"; g.set(k, [...(g.get(k) ?? []), p]); }
    return [...g.entries()];
  }, [meta.data]);
  const isOwnerRole = f.role === "COMPANY_OWNER";
  const template = (role: string) => { const t = (meta.data?.templates?.[role] ?? []) as string[]; setPerms(t); };

  const save = useAction(async () => {
    const common = { fullName: f.fullName, role: f.role, allStores: !!f.allStores, storeIds: f.allStores ? [] : stores, permissions: isOwnerRole ? [] : perms };
    if (userId) await put(`/users/${userId}`, common);
    else await post("/users", { ...common, userName: f.userName, password: f.password });
    toast("User saved.", "green");
    router.push("/users");
  });
  if (meta.loading && !meta.data) return <Loading />;
  const sellingStores = me.stores.filter((s) => !s.isHeadOffice);
  return (
    <RequirePerm perm="USER_ADMIN">
      <PageHeader title={userId ? "Edit user" : "New user"} subtitle="You can only give permissions and stores that you hold yourself." />
      <ErrorAlert error={save.error ?? meta.error ?? existing.error} onClose={save.clear} />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
        <Card>
          <FormGrid cols={3}>
            <Input label="User name" required disabled={!!userId} value={f.userName} onChange={(e) => setF({ ...f, userName: e.target.value })} error={fieldError(save.error, "userName")} hint="3–60 letters, digits, dot, dash or underscore." />
            <Input label="Full name" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} error={fieldError(save.error, "fullName")} />
            <Select label="Role" value={f.role} onChange={(e) => { setF({ ...f, role: e.target.value }); if (e.target.value !== "COMPANY_OWNER") template(e.target.value); }}>
              {((meta.data?.roles ?? []) as Row[]).map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
            </Select>
            {!userId && <Input label="Temporary password" type="text" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={fieldError(save.error, "password")} hint="The user must change it at first sign-in." />}
          </FormGrid>
        </Card>
        <Card title="Stores">
          {me.stores.some((s) => s.isHeadOffice) && <Checkbox label="Every store, including head office" checked={!!f.allStores} onChange={(e) => setF({ ...f, allStores: e.target.checked })} />}
          {!f.allStores && <div className="mt-2 flex flex-wrap gap-4">{sellingStores.map((s) => <Checkbox key={s.id} label={s.name} checked={stores.includes(s.id)} onChange={(e) => setStores(e.target.checked ? [...stores, s.id] : stores.filter((x) => x !== s.id))} />)}</div>}
          {fieldError(save.error, "storeIds") && <p className="mt-1 text-xs text-danger-600">{fieldError(save.error, "storeIds")}</p>}
        </Card>
        <Card title="Permissions" actions={!isOwnerRole && <div className="flex gap-2">{["STORE_MANAGER", "CASHIER_SALESMAN", "ACCOUNTANT"].map((r) => <Button key={r} size="sm" variant="secondary" type="button" onClick={() => template(r)}>As {r.replace(/_/g, " ").toLowerCase()}</Button>)}</div>}>
          {isOwnerRole ? <p className="text-[13px] text-muted">An owner holds every permission.</p> : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {grouped.map(([g, items]) => (
                <div key={g}><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{g}</div>
                  {items.map((p) => <Checkbox key={p.code} label={<span title={p.code}>{p.description}</span>} checked={perms.includes(p.code)} onChange={(e) => setPerms(e.target.checked ? [...perms, p.code] : perms.filter((x) => x !== p.code))} />)}</div>
              ))}
            </div>
          )}
        </Card>
        <div className="flex gap-2"><Button type="submit" loading={save.busy} disabled={!f.fullName || (!userId && (!f.userName || !f.password))}>Save</Button><Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button></div>
        {userId && existing.data?.lastLoginAt && <p className="text-xs text-muted">Last sign-in {dateTimeStr(existing.data.lastLoginAt)}</p>}
      </form>
    </RequirePerm>
  );
}
