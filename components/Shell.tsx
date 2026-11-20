import type { ReactNode } from "react";
import { Logo } from "./ui";

// Layout for the sign-in and password pages. On a wide screen: a brand panel beside the form.
// On a phone: just the form, with the logo above it.
export function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <Logo size="lg" />
          <span className="text-xl font-semibold tracking-tight">E-Footwear</span>
        </div>
        <div className="max-w-md space-y-6">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Run every store from one place.</h2>
          <ul className="space-y-3 text-indigo-100">
            <li className="flex gap-3"><span aria-hidden="true">✓</span>Stock, sales and accounts that always agree</li>
            <li className="flex gap-3"><span aria-hidden="true">✓</span>Keeps selling when the internet drops</li>
            <li className="flex gap-3"><span aria-hidden="true">✓</span>Each store sees only its own people and data</li>
          </ul>
        </div>
        <p className="text-sm text-indigo-200">Footwear and retail point of sale</p>
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5" />
      </aside>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <Logo />
            <span className="text-lg font-semibold tracking-tight text-slate-900">E-Footwear</span>
          </div>
          <header className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
