"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/kit";
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

  if (!ready) return <div className="mx-auto max-w-6xl px-6"><Loading /></div>;

  return (
    <Shell title="Choose a new password" subtitle="Your password is temporary. Change it before continuing.">
      <ChangePasswordForm />
    </Shell>
  );
}
