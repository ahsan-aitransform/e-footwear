"use client";

import type { ReactNode } from "react";
import { Loading } from "@/components/ui";
import { Header } from "@/components/Header";
import { useAuthGuard } from "@/lib/client/useAuthGuard";
import type { CompanyMe } from "@/lib/types";
import { roleLabel } from "@/lib/types";

// Guards every company screen on the client, then shows the header and the page.
export function CompanyFrame({ children }: { children: ReactNode }) {
  const guard = useAuthGuard("company");
  if (guard.status === "loading") return <div className="mx-auto max-w-6xl px-6"><Loading /></div>;

  const me = guard.session.me as CompanyMe;
  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        title={`Company ${me.companyId}`}
        who={`${roleLabel(me.roleCode)} (user ${me.userId})`}
        online={guard.online}
        kind="company"
      />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
