"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Loading } from "@/components/kit";
import { Header } from "@/components/Header";
import { useAuthGuard } from "@/lib/client/useAuthGuard";
import { cn } from "@/lib/utils";
import type { PlatformMe } from "@/lib/types";

const links = [
  { href: "/platform", label: "Companies" },
  { href: "/platform/directory", label: "Directory" },
];

function Menu() {
  const path = usePathname();
  return (
    <div className="mx-auto flex max-w-6xl gap-1 px-4 sm:px-6">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "border-b-2 px-3 py-2.5 text-sm font-medium",
            path === l.href ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}

// Guards every platform admin screen on the client, then shows the header, the menu and the page.
export function AdminFrame({ children }: { children: ReactNode }) {
  const guard = useAuthGuard("platform");
  if (guard.status === "loading") return <div className="mx-auto max-w-6xl px-6"><Loading /></div>;

  const me = guard.session.me as PlatformMe;
  return (
    <div className="min-h-screen bg-background">
      <Header title="Platform administration" who={me.username} online={guard.online} kind="platform" />
      <nav className="border-b bg-card">
        <Suspense fallback={<div className="h-10" />}>
          <Menu />
        </Suspense>
      </nav>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
