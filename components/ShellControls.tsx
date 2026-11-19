"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, type Locale } from "@/i18n/messages";
import { useT } from "@/i18n/LocaleProvider";

const LABEL: Record<Locale, string> = { en: "English", ur: "اردو" };

export function SignOutButton(): ReactNode {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut(): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }
  return (
    <button type="button" onClick={signOut} disabled={busy} className="btn-secondary btn-sm">
      {t("common.signOut")}
    </button>
  );
}

export function LanguageSwitch({ current }: { current: Locale }): ReactNode {
  const t = useT();
  const router = useRouter();

  async function choose(locale: Locale): Promise<void> {
    if (locale === current) return;
    const res = await fetch("/api/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    if (res.ok) router.refresh();
  }
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <span className="sr-only sm:not-sr-only">{t("common.language")}</span>
      <select value={current} onChange={(e) => void choose(e.target.value === "ur" ? "ur" : "en")} className="select">
        {LOCALES.map((l) => (
          <option key={l} value={l}>{LABEL[l]}</option>
        ))}
      </select>
    </label>
  );
}
