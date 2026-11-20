"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { clientApi } from "@/lib/client/api";
import { saveSession } from "@/lib/client/session";
import type { PlatformMe } from "@/lib/types";
import { Field } from "./Field";
import { Notice } from "./Notice";
import { SubmitButton } from "./SubmitButton";

// Platform administrator sign-in, in the browser. Needs a connection.
export function PlatformLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!username || !password) return setError("Enter your username and password.");

    setPending(true);
    setError(undefined);
    const login = await clientApi<{ accessToken: string }>("/platform/auth/login", {
      method: "POST",
      body: { username, password },
    });
    if (!login.ok) {
      setPending(false);
      return setError(login.offline ? "No connection. Sign-in needs the server." : login.message);
    }

    const me = await clientApi<PlatformMe>("/auth/me", { token: login.data.accessToken });
    if (!me.ok) {
      setPending(false);
      return setError(me.message);
    }
    await saveSession({ token: login.data.accessToken, me: me.data, signedInAt: new Date().toISOString() });
    setPending(false);
    router.replace("/platform");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Username" name="username" autoComplete="username" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <Notice error={error} />
      <SubmitButton label="Sign in" pendingLabel="Signing in..." pending={pending} fullWidth />
    </form>
  );
}
