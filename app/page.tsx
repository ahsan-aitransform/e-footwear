"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/kit";
import { isCompanySession, loadSession } from "@/lib/client/session";

// Entry point. It runs in the browser so it also works offline: the stored session decides where to go.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    loadSession().then((session) => {
      if (!session) router.replace("/login");
      else if (isCompanySession(session) && session.me.mustChangePassword) router.replace("/change-password");
      else router.replace("/dashboard");
    });
  }, [router]);

  return <div className="mx-auto max-w-6xl px-6"><Loading /></div>;
}
