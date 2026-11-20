import type { ReactNode } from "react";

// Layout for the sign-in and password pages: one centred card, readable on a phone.
export function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-600">{subtitle}</p>}
        </header>
        {children}
      </div>
    </main>
  );
}
