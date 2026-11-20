"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { clientApi } from "@/lib/client/api";
import { saveSession } from "@/lib/client/session";
import type { CompanyMe } from "@/lib/types";
import { Notice } from "./Notice";
import { Field } from "./Field";
import { SubmitButton } from "./SubmitButton";

// Company sign-in, in the browser. The token is stored in IndexedDB (see lib/client/session.ts).
// Signing in needs a connection; a device that is already signed in keeps working offline.
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const companyId = Number(form.get("companyId"));
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!Number.isInteger(companyId) || companyId <= 0 || !username || !password) {
      setError("Enter the company id, username and password.");
      return;
    }

    setPending(true);
    setError(undefined);

    const login = await clientApi<{ accessToken: string; mustChangePassword: boolean }>("/auth/login", {
      method: "POST",
      body: { companyId, username, password },
    });
    if (!login.ok) {
      setPending(false);
      setError(login.offline ? "No connection. Sign-in needs the server." : login.message);
      return;
    }

    const token = login.data.accessToken;
    const me = await clientApi<CompanyMe>("/auth/me", { token });
    if (!me.ok) {
      setPending(false);
      setError(me.message);
      return;
    }

    await saveSession({ token, me: me.data, signedInAt: new Date().toISOString() });
    router.replace(login.data.mustChangePassword ? "/change-password" : "/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {params.get("changed") === "1" && (
        <Notice message="Password changed. Sign in with your new password." />
      )}
      <Field label="Company id" name="companyId" type="number" inputMode="numeric" min={1} required />
      <Field label="Username" name="username" autoComplete="username" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <Notice error={error} />
      <SubmitButton label="Sign in" pendingLabel="Signing in..." pending={pending} />
    </form>
  );
}
