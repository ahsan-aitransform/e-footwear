"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { Shell } from "@/components/Shell";
import { isCompanySession, loadSession } from "@/lib/client/session";

// Shown while the account still has a temporary password. The API allows only this and sign-out.
export default function ChangePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSession().then((session) => {
      if (!session) router.replace("/login");
      else if (!isCompanySession(session) || !session.me.mustChangePassword) router.replace("/dashboard");
      else setReady(true);
    });
  }, [router]);

  if (!ready) return <p className="p-6 text-sm text-zinc-500">Loading...</p>;

  return (
    <Shell title="Choose a new password" subtitle="Your password is temporary. Change it before continuing.">
      <ChangePasswordForm />
    </Shell>
  );
}
