"use client";

import { useState, type FormEvent } from "react";
import { clientApi } from "@/lib/client/api";
import { loadSession } from "@/lib/client/session";
import { Field } from "./Field";
import { Notice } from "./Notice";
import { SubmitButton } from "./SubmitButton";

// Adds a store to a company (platform administrators only). onCreated reloads the store list.
export function CreateStoreForm({ companyId, onCreated }: { companyId: string; onCreated: () => void }) {
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const session = await loadSession();
    if (!session) return;

    setPending(true);
    setError(undefined);
    setMessage(undefined);
    const result = await clientApi<{ id: string }>(`/platform/companies/${companyId}/stores`, {
      method: "POST",
      token: session.token,
      body: { code: String(data.get("code") ?? "").trim(), name: String(data.get("name") ?? "").trim() },
    });
    setPending(false);
    if (!result.ok) return setError(result.offline ? "No connection. Adding a store needs the server." : result.message);

    form.reset();
    setMessage("Store created.");
    onCreated();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3">
      <Field label="Store code" name="code" maxLength={20} required />
      <div className="sm:col-span-2">
        <Field label="Store name" name="name" maxLength={120} required />
      </div>
      <div className="space-y-3 sm:col-span-3">
        <Notice error={error} message={message} />
        <SubmitButton label="Add store" pendingLabel="Adding..." pending={pending} />
      </div>
    </form>
  );
}
