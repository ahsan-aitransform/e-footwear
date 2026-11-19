"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import { isApiProblem } from "@/lib/types";
import { Field } from "@/components/ui";

const MIN_PASSWORD = 8; // UX hint only; the API enforces its configured minimum

async function readError(res: Response, fallback: string): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  return isApiProblem(body) ? body.detail : fallback;
}

export function PlatformLoginForm(): ReactNode {
  const t = useT();
  const router = useRouter();
  const [errors, setErrors] = useState<{ userName?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const userName = String(f.get("userName") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const next: { userName?: string; password?: string } = {};
    if (!userName) next.userName = "•";
    if (!password) next.password = "•";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const res = await fetch("/api/platform/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, password }),
      });
      if (res.ok) {
        router.replace("/platform");
        router.refresh();
        return;
      }
      setFormError(await readError(res, t("login.failed")));
    } catch {
      setFormError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card card-body flex flex-col gap-5 shadow-lg shadow-brand-900/5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">{t("platform.loginTitle")}</h1>
        <div className="h-1 w-12 rounded-full bg-brand-600" aria-hidden="true" />
      </div>
      <Field label={t("login.userName")} error={errors.userName}>
        <input name="userName" autoComplete="username" autoFocus className="input" aria-invalid={errors.userName !== undefined} />
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

type FieldName = "code" | "name" | "firstStoreCode" | "firstStoreName" | "ownerUserName" | "ownerDisplayName" | "ownerPassword";
const FIELDS: { name: FieldName; label: MessageKey; required: boolean; type?: string; autoComplete?: string }[] = [
  { name: "code", label: "platform.companyCode", required: true, autoComplete: "off" },
  { name: "name", label: "platform.companyName", required: true },
  { name: "firstStoreCode", label: "platform.firstStoreCode", required: true },
  { name: "firstStoreName", label: "platform.firstStoreName", required: true },
  { name: "ownerUserName", label: "platform.ownerUserName", required: true, autoComplete: "off" },
  { name: "ownerDisplayName", label: "platform.ownerDisplayName", required: false },
  { name: "ownerPassword", label: "platform.ownerPassword", required: true, type: "password", autoComplete: "new-password" },
];

/** Phase 3 "Company registration" (Part 2, 5.2): the platform owner registers a company, its first store and its owner. */
export function RegisterCompanyForm(): ReactNode {
  const t = useT();
  const router = useRouter();
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (busy) return;
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    const values = Object.fromEntries(FIELDS.map((x) => [x.name, String(f.get(x.name) ?? "").trim()])) as Record<FieldName, string>;

    const next: Partial<Record<FieldName, string>> = {};
    for (const x of FIELDS) if (x.required && !values[x.name]) next[x.name] = "•";
    if (values.code && !/^[a-z0-9][a-z0-9-]{1,29}$/.test(values.code.toLowerCase())) next.code = "a-z, 0-9, -";
    if (values.ownerPassword && values.ownerPassword.length < MIN_PASSWORD) next.ownerPassword = `≥ ${MIN_PASSWORD}`;
    setErrors(next);
    setFormError(null);
    setSuccess(false);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const res = await fetch("/api/platform/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: values.code.toLowerCase(),
          name: values.name,
          firstStoreCode: values.firstStoreCode,
          firstStoreName: values.firstStoreName,
          ownerUserName: values.ownerUserName,
          ownerDisplayName: values.ownerDisplayName || null,
          ownerPassword: values.ownerPassword,
        }),
      });
      if (res.status === 401) {
        router.replace("/platform/login?expired=1");
        return;
      }
      if (res.ok) {
        formEl.reset();
        setSuccess(true);
        router.refresh();
        return;
      }
      setFormError(await readError(res, t("common.error")));
    } catch {
      setFormError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card card-body grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="section-title">{t("platform.register")}</h2>
      </div>
      {FIELDS.map((x) => (
        <Field key={x.name} label={t(x.label)} error={errors[x.name]}>
          <input
            name={x.name}
            type={x.type ?? "text"}
            autoComplete={x.autoComplete ?? "on"}
            className="input"
            aria-invalid={errors[x.name] !== undefined}
          />
        </Field>
      ))}
      <div className="flex flex-col gap-3 sm:col-span-2">
        {formError !== null && <p role="alert" className="alert-error">{formError}</p>}
        {success && <p role="status" className="alert-success">{t("platform.registered")}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto sm:self-start">
          {busy ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </form>
  );
}

export function PlatformSignOut(): ReactNode {
  const t = useT();
  const router = useRouter();
  async function signOut(): Promise<void> {
    await fetch("/api/platform/logout", { method: "POST" }).catch(() => null);
    router.replace("/platform/login");
    router.refresh();
  }
  return (
    <button type="button" onClick={() => void signOut()} className="btn-secondary btn-sm">
      {t("common.signOut")}
    </button>
  );
}
