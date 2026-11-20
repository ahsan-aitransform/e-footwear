"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, ErrorAlert, PageHeader } from "@/components/ui/core";
import { Input } from "@/components/ui/form";
import { fieldError } from "@/components/ui/form";
import { useMe } from "@/components/session";
import { post } from "@/lib/api";
import { useAction } from "@/lib/hooks";

/** Own password change. The API ends every session of the user on success, so the user signs in again with the new password. */
export function ChangePassword() {
  const { me } = useMe();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const save = useAction(async () => {
    if (next !== again) throw new Error("The two new passwords do not match.");
    await post("/auth/change-password", { currentPassword: current, newPassword: next });
    await fetch("/api/session/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  });

  return (
    <>
      <PageHeader title="Change password" subtitle="You will be signed out and must sign in again with the new password." />
      <div className="max-w-md">
        <Card>
          {me.mustChangePassword && <Alert tone="amber">Your password was set by an administrator. Choose your own before you continue.</Alert>}
          <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
            <ErrorAlert error={save.error} onClose={save.clear} />
            <Input label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required error={fieldError(save.error, "currentPassword")} />
            <Input label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required hint="At least 8 characters, with letters and digits." error={fieldError(save.error, "newPassword")} />
            <Input label="Repeat new password" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required />
            <Button type="submit" loading={save.busy}>Change password</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
