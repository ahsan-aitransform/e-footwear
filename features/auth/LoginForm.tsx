"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import { isApiProblem } from "@/lib/types";
import { Field } from "@/components/ui";

type FieldErrors = Partial<Record<"companyCode" | "userName" | "password", string>>;

export function LoginForm(): ReactNode {
  const t = useT();
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (busy) return; // block duplicate submission
    const form = new FormData(e.currentTarget);
    const companyCode = String(form.get("companyCode") ?? "").trim();
    const userName = String(form.get("userName") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const next: FieldErrors = {};
    const required = "•";
    if (!companyCode) next.companyCode = required;
    if (!userName) next.userName = required;
    if (!password) next.password = required;
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode, userName, password }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      const body: unknown = await res.json().catch(() => null);
      setFormError(isApiProblem(body) ? body.detail : t("login.failed"));
    } catch {
      setFormError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card card-body flex flex-col gap-5 shadow-lg shadow-brand-900/5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">{t("login.title")}</h1>
        <div className="h-1 w-12 rounded-full bg-brand-600" aria-hidden="true" />
      </div>

      <Field label={t("login.company")} error={errors.companyCode}>
        <input name="companyCode" autoComplete="organization" autoFocus className="input" aria-invalid={errors.companyCode !== undefined} />
      </Field>
      <Field label={t("login.userName")} error={errors.userName}>
        <input name="userName" autoComplete="username" className="input" aria-invalid={errors.userName !== undefined} />
      </Field>
      <Field label={t("login.password")} error={errors.password}>
        <input name="password" type="password" autoComplete="current-password" className="input" aria-invalid={errors.password !== undefined} />
      </Field>

      {formError !== null && <p role="alert" className="alert-error">{formError}</p>}

      <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
        {busy ? t("common.loading") : t("login.submit")}
      </button>
    </form>
  );
}
