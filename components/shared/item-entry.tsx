"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ApiError, get, type Row } from "@/lib/api";
import { useDebounced } from "@/lib/hooks";
import { money, qty } from "@/lib/format";
import { Icon } from "@/components/ui/icons";
import { cx } from "@/components/ui/core";

export type ItemEntryHandle = { focus: () => void };

/**
 * One input for everything a counter does: scan a barcode (exact match → the item, or a deal) or type a name/code (suggestions).
 * `onPick` gets the /catalog/lookup row: `kind` is "VARIANT" (has salePrice, stockQty…) or "BUNDLE" (a deal with items).
 */
export const ItemEntry = forwardRef<ItemEntryHandle, { onPick: (item: Row) => void; storeId?: number; placeholder?: string; autoFocus?: boolean; disabled?: boolean }>(
  function ItemEntry({ onPick, storeId, placeholder = "Scan barcode or type product code / name…", autoFocus = true, disabled }, ref) {
    const input = useRef<HTMLInputElement>(null);
    const [text, setText] = useState("");
    const [msg, setMsg] = useState<string | null>(null);
    const [suggest, setSuggest] = useState<Row[]>([]);
    const debounced = useDebounced(text, 250);
    useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));

    useEffect(() => {
      if (debounced.trim().length < 2) { setSuggest([]); return; }
      const ctl = new AbortController();
      get<Row[]>("/catalog/search", { q: debounced.trim(), storeId, limit: 10 }, ctl.signal).then(setSuggest).catch(() => undefined);
      return () => ctl.abort();
    }, [debounced, storeId]);

    async function resolve(raw: string) {
      const t = raw.trim();
      if (!t) return;
      setMsg(null);
      try {
        done(await get<Row>("/catalog/lookup", { barcode: t, storeId }));
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          // not an exact barcode: if the typed text matches exactly one size, use it
          const rows = await get<Row[]>("/catalog/search", { q: t, storeId, limit: 5 }).catch(() => [] as Row[]);
          if (rows.length === 1) await pick(rows[0]);
          else setMsg(rows.length > 1 ? "Several items match — choose one from the list." : `Nothing found for “${t}”.`);
        } else setMsg((e as Error).message);
      }
    }

    async function pick(s: Row) {
      try { done(await get<Row>("/catalog/lookup", { barcode: s.barcode, storeId })); } catch (e) { setMsg((e as Error).message); }
    }

    function done(item: Row) {
      onPick(item);
      setText(""); setSuggest([]); setMsg(null);
      input.current?.focus();
    }

    return (
      <div className="relative">
        <div className="relative">
          <Icon name="barcode" size={18} className="absolute left-3 top-2.5 text-primary-600" />
          <input ref={input} value={text} autoFocus={autoFocus} disabled={disabled} placeholder={placeholder} aria-label="Item entry: scan or search"
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void resolve(text); } }}
            className="h-11 w-full rounded-md border-2 border-primary-200 bg-white pl-10 pr-3 text-[15px] focus:border-primary-600" />
        </div>
        {msg && <p role="alert" className="mt-1 text-xs text-danger-600">{msg}</p>}
        {suggest.length > 0 && text.trim().length >= 2 && (
          <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-line bg-white shadow-lg">
            {suggest.map((s) => (
              <li key={s.variantId}>
                <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-primary-50" onClick={() => void pick(s)}>
                  <span><span className="font-medium">{s.productName}</span> <span className="text-muted">size {s.sizeCode}{s.color ? ` · ${s.color}` : ""} · {s.productCode}</span></span>
                  <span className={cx("text-xs", Number(s.stockQty) <= 0 ? "text-danger-600" : "text-muted")}>{money(s.listPrice)} · stock {qty(s.stockQty)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);
