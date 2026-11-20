"use client";
import { useEffect, useRef, useState } from "react";
import { get, type Page, type Row } from "@/lib/api";
import { useDebounced, useQuery } from "@/lib/hooks";
import { Select } from "@/components/ui/form";
import { cx } from "@/components/ui/core";
import { Icon } from "@/components/ui/icons";
import { useMe } from "@/components/session";

/** Store dropdown over the stores the user holds. `all` adds an "All stores" choice; head office is only offered when `withHeadOffice`. */
export function StoreSelect({ value, onChange, label = "Store", all, withHeadOffice, className }:
  { value: number | null; onChange: (v: number | null) => void; label?: string; all?: boolean; withHeadOffice?: boolean; className?: string }) {
  const { me } = useMe();
  const stores = me.stores.filter((s) => withHeadOffice || !s.isHeadOffice);
  return (
    <Select label={label} className={className} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}>
      {all && <option value="">All stores</option>}
      {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </Select>
  );
}

/** A master list (department, brand, season, colour, size group…) as a dropdown. */
export function MasterSelect({ kind, value, onChange, label, placeholder = "Select…", error, required }:
  { kind: string; value: number | null | undefined; onChange: (v: number | null) => void; label?: string; placeholder?: string; error?: string; required?: boolean }) {
  const { data } = useQuery(() => get<Row[]>(`/masters/${kind}`), [kind]);
  return (
    <Select label={label} error={error} required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}>
      <option value="">{placeholder}</option>
      {(data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
    </Select>
  );
}

/** Categories (they belong to a department). */
export function CategorySelect({ value, onChange, departmentId, label = "Category", error, required }:
  { value: number | null | undefined; onChange: (v: number | null) => void; departmentId?: number | null; label?: string; error?: string; required?: boolean }) {
  const { data } = useQuery(() => get<Row[]>("/masters/categories", { departmentId: departmentId ?? undefined }), [departmentId]);
  return (
    <Select label={label} error={error} required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}>
      <option value="">Select…</option>
      {(data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
    </Select>
  );
}

type PartyKind = "customer" | "vendor" | "staff";

/** Type-ahead picker over /parties (customers, vendors or staff). */
export function PartyPicker({ kind, value, onChange, label, placeholder = "Search by name, code or phone…", error, required }:
  { kind: PartyKind; value: Row | null; onChange: (p: Row | null) => void; label?: string; placeholder?: string; error?: string; required?: boolean }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(text, 200);
  const box = useRef<HTMLDivElement>(null);
  const { data } = useQuery(() => get<Page<Row>>("/parties", { [kind]: true, search: debounced, pageSize: 20, status: "ACTIVE" }), [kind, debounced], { skip: !open });

  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const rows = data?.items ?? [];
  return (
    <div ref={box} className="relative">
      {label && <label className="mb-1 block text-[13px] font-medium">{label}{required && <span className="text-danger-600"> *</span>}</label>}
      {value && !open ? (
        <div className={cx("flex h-9 items-center justify-between rounded-md border bg-white px-2.5", error ? "border-danger-600" : "border-line-strong")}>
          <span className="truncate">{value.name}{value.phonePrimary ? <span className="text-muted"> · {value.phonePrimary}</span> : null}</span>
          <button type="button" aria-label="Change" className="text-primary-700" onClick={() => { setText(""); setOpen(true); }}><Icon name="edit" size={14} /></button>
        </div>
      ) : (
        <input value={text} autoFocus={open} placeholder={placeholder} onFocus={() => setOpen(true)} onChange={(e) => { setText(e.target.value); setOpen(true); }}
          className={cx("h-9 w-full rounded-md border bg-white px-2.5", error ? "border-danger-600" : "border-line-strong")} />
      )}
      {open && (
        <ul role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-white shadow-lg">
          {rows.length === 0 && <li className="px-3 py-2 text-muted">No match</li>}
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" role="option" aria-selected={value?.id === r.id} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-primary-50"
                onClick={() => { onChange(r); setOpen(false); setText(""); }}>
                <span>{r.name}</span><span className="text-xs text-muted">{r.code}{r.phonePrimary ? ` · ${r.phonePrimary}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}

/** Any postable GL account, as a dropdown (vouchers, opening balances). */
export function AccountSelect({ value, onChange, label = "Account", types, error }:
  { value: number | null; onChange: (v: number | null) => void; label?: string; types?: string[]; error?: string }) {
  const { data } = useQuery(() => get<Row[]>("/accounting/accounts"), []);
  const rows = (data ?? []).filter((a) => a.isActive && a.isPostable && (!types || types.includes(a.mainType)));
  return (
    <Select label={label} error={error} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}>
      <option value="">Select account…</option>
      {rows.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
    </Select>
  );
}
