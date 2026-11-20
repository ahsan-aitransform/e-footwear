import type { ReactNode } from "react";

// Small building blocks shared by every screen, so spacing, colours and typography stay consistent.

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-11 w-11 text-lg" : "h-9 w-9 text-sm";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${box} items-center justify-center rounded-xl bg-indigo-600 font-bold tracking-tight text-white shadow-sm`}
    >
      EF
    </span>
  );
}

/** A white panel with an optional title, description and right-hand action. */
export function Card({
  title,
  description,
  action,
  children,
  padded = true,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? "p-5 sm:p-6" : ""}>{children}</div>
    </section>
  );
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

type Tone = "slate" | "indigo" | "green" | "amber" | "red" | "sky" | "violet" | "emerald";

const tones: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  green: "bg-green-50 text-green-700 ring-green-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

const roleTones: Record<string, Tone> = {
  COMPANY_OWNER: "violet",
  STORE_MANAGER: "indigo",
  CASHIER_SALESMAN: "sky",
  ACCOUNTANT: "emerald",
};

export function RoleBadge({ code, label }: { code: string; label: string }) {
  return <Badge tone={roleTones[code] ?? "slate"}>{label}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Tone = status === "ACTIVE" ? "green" : status === "LOCKED" ? "amber" : "red";
  return <Badge tone={tone}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

/** A table wrapper: scrolls sideways on small screens, with a quiet header row. */
export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th scope="col" className="whitespace-nowrap bg-slate-50 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-6">
      {children}
    </th>
  );
}

export function Td({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <td className={`whitespace-nowrap px-5 py-3.5 sm:px-6 ${strong ? "font-medium text-slate-900" : "text-slate-600"}`}>
      {children}
    </td>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      {label}...
    </div>
  );
}
