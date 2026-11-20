"use client";

import { useState, type FormEvent } from "react";
import { clientApi } from "@/lib/client/api";
import { loadSession } from "@/lib/client/session";
import type { CreationOptions } from "@/lib/types";
import { roleLabel } from "@/lib/types";
import { Field } from "./Field";
import { Notice } from "./Notice";
import { SubmitButton } from "./SubmitButton";

// Creates a user. The roles and stores offered come from the API, so the form only offers what the signed-in
// person may do; the API checks the choice again on submit. Creating users needs the server, so it is disabled offline.
export function CreateUserForm({
  companyId,
  options,
  online,
  onCreated,
}: {
  companyId?: number;
  options: CreationOptions;
  online: boolean;
  onCreated: () => void;
}) {
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  if (options.roles.length === 0) {
    return <p className="text-sm text-slate-600">Your role cannot create users.</p>;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const session = await loadSession();
    if (!session) return;

    setPending(true);
    setError(undefined);
    setMessage(undefined);
    const result = await clientApi<{ id: number }>("/users", {
      method: "POST",
      token: session.token,
      body: {
        companyId: companyId ?? null,
        email: String(data.get("email") ?? "").trim(),
        fullName: String(data.get("fullName") ?? "").trim(),
        roleCode: String(data.get("roleCode") ?? ""),
        storeIds: data.getAll("storeIds").map((value) => Number(value)),
        password: String(data.get("password") ?? ""),
      },
    });
    setPending(false);
    if (!result.ok) return setError(result.offline ? "No connection. Creating a user needs the server." : result.message);

    form.reset();
    setMessage("User created. They must change the temporary password at first sign-in.");
    onCreated();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Email" name="email" type="email" autoComplete="off" hint="They sign in with this email." required />
      <Field label="Full name" name="fullName" required />

      <div className="space-y-1">
        <label htmlFor="field-roleCode" className="block text-sm font-medium text-slate-700">
          Role
        </label>
        <select
          id="field-roleCode"
          name="roleCode"
          required
          defaultValue={options.roles[0]}
          className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          {options.roles.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
        </select>
      </div>

      <Field label="Temporary password" name="password" type="password" autoComplete="new-password" minLength={8} required />

      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="text-sm font-medium text-slate-700">
          Store (one for a store manager; one or more for staff; none for a company owner)
        </legend>
        {options.stores.length === 0 ? (
          <p className="text-sm text-slate-500">No stores available.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {options.stores.map((store) => (
              <label key={store.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/40 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50">
                <input type="checkbox" name="storeIds" value={store.id} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                <span>
                  {store.code} · {store.name}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="space-y-3 sm:col-span-2">
        {!online && <Notice error="You are offline. Users can be added when the device is back online." />}
        <Notice error={error} message={message} />
        <SubmitButton label="Create user" pendingLabel="Creating..." pending={pending} disabled={!online} />
      </div>
    </form>
  );
}
