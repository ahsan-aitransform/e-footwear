"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import { isApiProblem } from "@/lib/types";
import { Field } from "@/components/ui";

const MIN_PASSWORD = 8; // UX hint only; the API enforces its own configured minimum

export function NewUserForm({ canGrantAdmin, storeIds }: { canGrantAdmin: boolean; storeIds: number[] }): ReactNode {
  const t = useT();
  const router = useRouter();
  const [errors, setErrors] = useState<{ userName?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (busy) return;
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    const userName = String(f.get("userName") ?? "").trim();
    const displayName = String(f.get("displayName") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const isAdmin = f.get("isAdministrator") === "on";

    const next: { userName?: string; password?: string } = {};
    if (!userName) next.userName = "•";
    if (password.length < MIN_PASSWORD) next.password = `≥ ${MIN_PASSWORD}`;
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const res = await fetch("/api/backend/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName, displayName: displayName || null, password,
          isAdministrator: canGrantAdmin && isAdmin, isCompanyOwner: false,
          storeIds, roleIds: [],
          canEdit: false, canDelete: false, canPrint: true, canChangePrice: false, canGiveDiscount: false,
        }),
      });
      if (res.ok) {
        formEl.reset();
        router.refresh();
        return;
      }
      const body: unknown = await res.json().catch(() => null);
      setFormError(isApiProblem(body) ? body.detail : t("common.error"));
    } catch {
      setFormError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card card-body grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <h2 className="section-title sm:col-span-2 lg:col-span-3">{t("users.new")}</h2>
      <Field label={t("users.userName")} error={errors.userName}>
        <input name="userName" autoComplete="off" className="input" aria-invalid={errors.userName !== undefined} />
      </Field>
      <Field label={t("users.displayName")}>
        <input name="displayName" className="input" />
      </Field>
      <Field label={t("users.password")} error={errors.password}>
        <input name="password" type="password" autoComplete="new-password" className="input" aria-invalid={errors.password !== undefined} />
      </Field>
      {canGrantAdmin && (
        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2 lg:col-span-3">
          <input name="isAdministrator" type="checkbox" className="size-4 accent-brand-600" />
          <span>{t("users.role")}</span>
        </label>
      )}
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
        {formError !== null && <p role="alert" className="alert-error">{formError}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto sm:self-start">
          {busy ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </form>
  );
}

export function StatusButton({ id, blocked }: { id: number; blocked: boolean }): ReactNode {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/backend/users/${id}/${blocked ? "activate" : "block"}`, { method: "POST" });
      if (res.ok) {
        router.refresh();
        return;
      }
      const body: unknown = await res.json().catch(() => null);
      setError(isApiProblem(body) ? body.detail : t("common.error"));
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="flex flex-col gap-1">
      <button type="button" onClick={toggle} disabled={busy} className="btn-secondary btn-sm">
        {blocked ? t("users.activate") : t("users.block")}
      </button>
      {error !== null && <span role="alert" className="field-error text-xs">{error}</span>}
    </span>
  );
}
