"use client";

import type { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { BrandLogo } from "./BrandLogo";
import { LanguageSwitch } from "./LanguageSwitch";

// Layout of the sign-in and password pages. On a wide screen: a brand panel beside the form.
// On a phone: just the form, with the logo above it.
export function AuthenticationCardLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { translateMessage } = useTranslation();
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-brand-start via-brand-middle to-brand-end p-12 text-brand-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size="lg" className="bg-brand-foreground/15 text-brand-foreground" />
          <span className="text-xl font-semibold tracking-tight">{translateMessage("common.applicationName")}</span>
        </div>
        <div className="max-w-md space-y-6">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight">
            {translateMessage("security.brandPanel.headline")}
          </h2>
          <ul className="space-y-3 text-brand-foreground-muted">
            {(
              [
                "security.brandPanel.pointStockAndAccounts",
                "security.brandPanel.pointOfflineSelling",
                "security.brandPanel.pointStoreIsolation",
              ] as const
            ).map((messageKey) => (
              <li key={messageKey} className="flex gap-3">
                <span aria-hidden="true">✓</span>
                {translateMessage(messageKey)}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-brand-foreground-muted">{translateMessage("common.applicationTagline")}</p>
        <div aria-hidden="true" className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-brand-foreground/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -start-16 -bottom-32 h-80 w-80 rounded-full bg-brand-foreground/5" />
      </aside>

      <section className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex justify-end">
          <LanguageSwitch />
        </div>
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-sm space-y-8">
            <div className="flex items-center gap-3 lg:hidden">
              <BrandLogo />
              <span className="text-lg font-semibold tracking-tight text-foreground">
                {translateMessage("common.applicationName")}
              </span>
            </div>
            <header className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </header>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
