"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { clientApi } from "@/lib/client/api";
import { loadSession } from "@/lib/client/session";
import { Field } from "./Field";
import { Notice } from "./Notice";
import { SubmitButton } from "./SubmitButton";

// Registers a company with its first store and owner. The owner signs in with the temporary password set here.
export function CreateCompanyForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const session = await loadSession();
    if (!session) return router.replace("/platform/login");

    const text = (name: string) => String(form.get(name) ?? "").trim();
    setPending(true);
    setError(undefined);
    const result = await clientApi<{ companyId: number }>("/platform/companies", {
      method: "POST",
      token: session.token,
      body: {
        name: text("name"),
        timezone: text("timezone") || null,
        ownerEmail: text("ownerEmail"),
        ownerFullName: text("ownerFullName"),
        ownerPassword: String(form.get("ownerPassword") ?? ""),
        firstStoreCode: text("firstStoreCode"),
        firstStoreName: text("firstStoreName"),
      },
    });
    if (!result.ok) {
      setPending(false);
      return setError(result.offline ? "No connection. Registering a company needs the server." : result.message);
    }
    router.push(`/platform/companies/${result.data.companyId}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Company name" name="name" maxLength={120} required />
      </div>
      <Field label="Time zone" name="timezone" defaultValue="Asia/Karachi" />
      <div />
      <Field label="Owner email" name="ownerEmail" type="email" autoComplete="off" required />
      <Field label="Owner full name" name="ownerFullName" required />
      <div className="sm:col-span-2">
        <Field label="Owner temporary password" name="ownerPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <Field label="First store code" name="firstStoreCode" maxLength={20} required />
      <Field label="First store name" name="firstStoreName" maxLength={120} required />
      <p className="text-xs text-slate-500 sm:col-span-2">The owner must change the temporary password at first sign-in.</p>
      <div className="space-y-3 sm:col-span-2">
        <Notice error={error} />
        <SubmitButton label="Create company" pendingLabel="Creating..." pending={pending} />
      </div>
    </form>
  );
}
