"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { clientApi } from "@/lib/client/api";
import { clearSession, loadSession } from "@/lib/client/session";
import { Field } from "./Field";
import { Notice } from "./Notice";
import { SubmitButton } from "./SubmitButton";

// Replaces a temporary password. Needs a connection. The server ends every session of the user on success,
// so the stored session is removed and the person signs in again.
export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");

    if (newPassword.length < 8) return setError("The new password needs at least 8 characters.");
    if (newPassword !== confirm) return setError("The new password and its confirmation do not match.");

    const stored = await loadSession();
    if (!stored) return router.replace("/login");

    setPending(true);
    setError(undefined);
    const result = await clientApi("/auth/change-password", {
      method: "POST",
      token: stored.token,
      body: { currentPassword, newPassword },
    });
    if (!result.ok) {
      setPending(false);
      return setError(result.offline ? "No connection. Changing the password needs the server." : result.message);
    }

    await clearSession();
    router.replace("/login?changed=1");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Current (temporary) password" name="currentPassword" type="password" autoComplete="current-password" required />
      <Field label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      <Field label="Repeat new password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      <p className="text-xs text-slate-500">At least 8 characters. You will sign in again afterwards.</p>
      <Notice error={error} />
      <SubmitButton label="Change password" pendingLabel="Saving..." pending={pending} fullWidth />
    </form>
  );
}
