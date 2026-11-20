"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { useAuthGuard } from "@/lib/client/useAuthGuard";
import type { PlatformMe } from "@/lib/types";

// Guards every platform admin screen on the client, then shows the header and the page.
export function AdminFrame({ children }: { children: ReactNode }) {
  const guard = useAuthGuard("platform");
  if (guard.status === "loading") return <p className="p-6 text-sm text-zinc-500">Loading...</p>;

  const me = guard.session.me as PlatformMe;
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header title="Platform administration" who={me.username} online={guard.online} kind="platform" />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">{children}</main>
    </div>
  );
}
