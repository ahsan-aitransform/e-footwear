"use client";

import type { ReactNode } from "react";
import { Loading } from "@/components/ui";
import { Header } from "@/components/Header";
import { useAuthGuard } from "@/lib/client/useAuthGuard";
import type { PlatformMe } from "@/lib/types";

// Guards every platform admin screen on the client, then shows the header and the page.
export function AdminFrame({ children }: { children: ReactNode }) {
  const guard = useAuthGuard("platform");
  if (guard.status === "loading") return <div className="mx-auto max-w-6xl px-6"><Loading /></div>;

  const me = guard.session.me as PlatformMe;
  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Platform administration" who={me.username} online={guard.online} kind="platform" />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
