import type { ReactNode } from "react";

/** Labelled form field with an error message next to it (Part 28: errors appear next to relevant fields). */
export function Field({ label, error, children }: { label: string; error?: string | undefined; children: ReactNode }): ReactNode {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      {children}
      {error !== undefined && <span role="alert" className="field-error">{error}</span>}
    </label>
  );
}

/** Brand mark used on headers and sign-in pages. */
export function BrandMark({ name, size = "md" }: { name: string; size?: "md" | "lg" }): ReactNode {
  const box = size === "lg" ? "size-12 text-xl" : "size-9 text-base";
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true" className={`${box} grid place-items-center rounded-xl bg-brand-600 font-bold text-white shadow-sm`}>EF</span>
      <span className={size === "lg" ? "text-2xl font-bold text-ink" : "text-lg font-semibold text-ink"}>{name}</span>
    </span>
  );
}

/** Centred card layout for sign-in screens: white card on a soft blue background. */
export function AuthShell({ brand, children, footer }: { brand: string; children: ReactNode; footer?: ReactNode }): ReactNode {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -end-24 size-72 rounded-full bg-brand-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -start-24 size-72 rounded-full bg-brand-300/40 blur-3xl" />
      <div className="relative">
        <BrandMark name={brand} size="lg" />
      </div>
      <div className="relative w-full max-w-md">{children}</div>
      {footer !== undefined && <div className="relative">{footer}</div>}
    </main>
  );
}
