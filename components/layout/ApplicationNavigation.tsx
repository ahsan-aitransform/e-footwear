"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { buildNavigationTree } from "@/lib/routing/buildNavigationTree";
import { useCurrentSession } from "@/lib/session/useSessionState";
import { cn } from "@/lib/utils";
import { navigationIconByName } from "./navigationIcons";

// The menu: generated from the route registry and filtered by the signed-in person's audience and permissions
// (lib/routing/buildNavigationTree.ts). Modules are groups, screens are items. There is no hand-written menu anywhere.
export function ApplicationNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const session = useCurrentSession();
  const pathname = usePathname();
  const { translateMessage } = useTranslation();
  const groups = useMemo(() => (session ? buildNavigationTree(session) : []), [session]);

  const allHrefs = groups.flatMap((group) => group.items.map((item) => item.href));
  // /platform is active on /platform/companies/..., but not when a longer entry such as /platform/directory matches better.
  function isActive(href: string): boolean {
    const matches = (candidate: string) => pathname === candidate || pathname.startsWith(`${candidate}/`);
    return matches(href) && !allHrefs.some((other) => other.length > href.length && matches(other));
  }

  return (
    <nav aria-label={translateMessage("navigation.mainMenuLabel")} className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.groupCode} className="space-y-1">
          <p className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {translateMessage(group.labelMessageKey)}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = navigationIconByName[item.iconName];
              const active = isActive(item.href);
              return (
                <li key={item.routeKey}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {translateMessage(item.labelMessageKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
