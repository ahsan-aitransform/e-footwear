"use client";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { ApiError } from "@/lib/api";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ------------------------------------------------------------------ button

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-300",
  secondary: "bg-white text-ink border border-line-strong hover:bg-primary-50 disabled:text-muted",
  ghost: "bg-transparent text-primary-700 hover:bg-primary-50 disabled:text-muted",
  danger: "bg-danger-600 text-white hover:bg-danger-700 disabled:opacity-50",
};

export function Button({ variant = "primary", icon, loading, size = "md", className, children, ...rest }:
  { variant?: Variant; icon?: IconName; loading?: boolean; size?: "sm" | "md" | "lg" } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed",
        size === "sm" ? "h-8 px-2.5 text-[13px]" : size === "lg" ? "h-11 px-5 text-[15px]" : "h-9 px-3.5",
        variants[variant], className,
      )}
    >
      {loading ? <Spinner size={14} /> : icon ? <Icon name={icon} size={size === "sm" ? 15 : 16} /> : null}
      {children}
    </button>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <span role="status" aria-label="Loading" style={{ width: size, height: size }} className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

// ------------------------------------------------------------------ layout bits

export function Card({ title, actions, children, className, pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx("rounded-lg border border-line bg-white", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </header>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

const badgeTones = {
  neutral: "bg-surface text-ink border-line",
  blue: "bg-primary-50 text-primary-800 border-primary-100",
  green: "bg-success-50 text-success-600 border-success-50",
  red: "bg-danger-50 text-danger-700 border-danger-50",
  amber: "bg-warn-50 text-warn-600 border-warn-50",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return <span className={cx("inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", badgeTones[tone])}>{children}</span>;
}

const statusTone: Record<string, keyof typeof badgeTones> = {
  POSTED: "green", PAID: "green", ACTIVE: "green", COMPLETED: "green", APPROVED: "green", KEPT: "green", CLOSED: "blue", ADJUSTED: "blue",
  PARTIAL: "amber", PARTIALLY_POSTED: "amber", DISPATCHED: "amber", PENDING: "amber", OPEN: "amber", NOT_POSTED: "amber",
  UNPAID: "red", DELETED: "red", CANCELLED: "red", BLOCKED: "red", REJECTED: "red", BROKEN: "red", INACTIVE: "neutral",
};
export const StatusBadge = ({ value }: { value: string | null | undefined }) => (value ? <Badge tone={statusTone[value] ?? "neutral"}>{value.replace(/_/g, " ")}</Badge> : null);

export function Alert({ tone = "red", children, onClose }: { tone?: "red" | "amber" | "blue" | "green"; children: ReactNode; onClose?: () => void }) {
  const t = { red: "bg-danger-50 text-danger-700 border-danger-50", amber: "bg-warn-50 text-warn-600 border-warn-50", blue: "bg-primary-50 text-primary-800 border-primary-100", green: "bg-success-50 text-success-600 border-success-50" }[tone];
  return (
    <div role={tone === "red" ? "alert" : "status"} className={cx("flex items-start gap-2 rounded-md border px-3 py-2 text-[13px]", t)}>
      <Icon name={tone === "green" ? "check" : tone === "blue" ? "info" : "alert"} size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
      {onClose && <button aria-label="Dismiss" onClick={onClose} className="opacity-70 hover:opacity-100"><Icon name="x" size={14} /></button>}
    </div>
  );
}

/** Renders any thrown value from the API as a readable alert, listing field errors. */
export function ErrorAlert({ error, onClose }: { error: unknown; onClose?: () => void }) {
  if (!error) return null;
  const e = error as ApiError;
  const fields = e.fieldErrors ? Object.entries(e.fieldErrors) : [];
  return (
    <Alert onClose={onClose}>
      <div className="font-medium">{e.message}</div>
      {fields.length > 0 && <ul className="mt-1 list-disc pl-4">{fields.map(([k, v]) => <li key={k}>{v.join(" ")}</li>)}</ul>}
    </Alert>
  );
}

export function Empty({ children = "Nothing to show yet.", icon = "info" }: { children?: ReactNode; icon?: IconName }) {
  return <div className="flex flex-col items-center gap-2 px-4 py-10 text-muted"><Icon name={icon} size={26} /><div>{children}</div></div>;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 px-4 py-10 text-muted"><Spinner /> {label}</div>;
}

export function Tabs({ tabs, value, onChange }: { tabs: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  return (
    <div role="tablist" className="no-print mb-4 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
          className={cx("whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium", value === t.key ? "border-primary-600 text-primary-700" : "border-transparent text-muted hover:text-ink")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ modal

export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-3 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className={cx("w-full rounded-lg bg-white shadow-xl outline-none", wide ? "max-w-4xl" : "max-w-lg")}>
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id={id} className="text-base font-semibold">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded p-1 text-muted hover:bg-surface"><Icon name="x" /></button>
        </header>
        <div className="p-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger, onConfirm, onClose, reasonLabel }:
  { open: boolean; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: (reason?: string) => Promise<unknown> | void; onClose: () => void; reasonLabel?: string }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<unknown>();
  const close = () => { setReason(""); setErr(undefined); onClose(); };
  return (
    <Modal open={open} title={title} onClose={close}
      footer={<><Button variant="secondary" onClick={close}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} loading={busy} disabled={!!reasonLabel && !reason.trim()}
          onClick={async () => { setBusy(true); setErr(undefined); try { await onConfirm(reason.trim() || undefined); close(); } catch (e) { setErr(e); } finally { setBusy(false); } }}>{confirmLabel}</Button></>}>
      <div className="space-y-3">
        <div>{message}</div>
        {reasonLabel && <label className="block"><span className="mb-1 block text-[13px] font-medium">{reasonLabel}</span><input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 w-full rounded-md border border-line-strong px-2.5" /></label>}
        <ErrorAlert error={err} />
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ toast

type Toast = { id: number; tone: "green" | "red" | "blue"; text: string };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "green") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, tone, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="no-print fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
        {items.map((t) => <Alert key={t.id} tone={t.tone === "blue" ? "blue" : t.tone}>{t.text}</Alert>)}
      </div>
    </ToastCtx.Provider>
  );
}
