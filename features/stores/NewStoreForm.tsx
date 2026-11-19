"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/LocaleProvider";
import { isApiProblem } from "@/lib/types";
import { Field } from "@/components/ui";

export function NewStoreForm(): ReactNode {
  const t = useT();
  const router = useRouter();
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (busy) return;
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    const code = String(f.get("code") ?? "").trim();
    const name = String(f.get("name") ?? "").trim();
    const cityName = String(f.get("cityName") ?? "").trim();
    const phone = String(f.get("phone") ?? "").trim();

    const next: { code?: string; name?: string } = {};
    if (!code) next.code = "•";
    if (!name) next.name = "•";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const res = await fetch("/api/backend/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, cityName: cityName || null, phone: phone || null }),
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
    <form onSubmit={onSubmit} noValidate className="card card-body grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <h2 className="section-title sm:col-span-2 lg:col-span-4">{t("stores.new")}</h2>
      <Field label={t("stores.code")} error={errors.code}>
        <input name="code" className="input" aria-invalid={errors.code !== undefined} />
      </Field>
      <Field label={t("stores.name")} error={errors.name}>
        <input name="name" className="input" aria-invalid={errors.name !== undefined} />
      </Field>
      <Field label={t("stores.city")}>
        <input name="cityName" className="input" />
      </Field>
      <Field label={t("stores.phone")}>
        <input name="phone" inputMode="tel" className="input" />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-4">
        {formError !== null && <p role="alert" className="alert-error">{formError}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto sm:self-start">
          {busy ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </form>
  );
}
