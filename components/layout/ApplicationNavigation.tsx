"use client";

import { ChevronDown, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { setSidebarGroupOpen } from "@/lib/layout/sidebarPreferenceStore";
import { useSidebarPreference } from "@/lib/layout/useSidebarPreference";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { buildNavigationTree, type NavigationGroup, type NavigationItem } from "@/lib/routing/buildNavigationTree";
import { useCurrentSession } from "@/lib/session/useSessionState";
import { cn } from "@/lib/utils";
import { navigationIconByName } from "./navigationIcons";

type VisibleGroup = { group: NavigationGroup; items: NavigationItem[] };

// The menu: generated from the route registry and filtered by the signed-in person's audience and permissions
// (lib/routing/buildNavigationTree.ts). Modules are groups, screens are items. There is no hand-written menu anywhere.
//  - The search box filters the groups and screens by name (a group whose name matches shows all its screens).
//  - Every group can be opened and closed; the choice is remembered (lib/layout/sidebarPreferenceStore.ts). A group that
//    was never touched is open when it holds the page being shown.
//  - isCollapsed shows only the icons (the sidebar of the desktop shell, collapsed); the search icon asks to expand it.
export function ApplicationNavigation({
  onNavigate,
  isCollapsed = false,
  onRequestExpand,
}: {
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onRequestExpand?: () => void;
}) {
  const session = useCurrentSession();
  const pathname = usePathname();
  const { translateMessage } = useTranslation();
  const sidebarPreference = useSidebarPreference();
  const [searchText, setSearchText] = useState("");
  const groups = useMemo(() => (session ? buildNavigationTree(session) : []), [session]);

  const allHrefs = groups.flatMap((group) => group.items.map((item) => item.href));
  // /platform is active on /platform/companies/..., but not when a longer entry such as /platform/directory matches better.
  function isActive(href: string): boolean {
    const matches = (candidate: string) => pathname === candidate || pathname.startsWith(`${candidate}/`);
    return matches(href) && !allHrefs.some((other) => other.length > href.length && matches(other));
  }

  const searchNeedle = searchText.trim().toLocaleLowerCase();
  const isSearching = searchNeedle !== "";
  const visibleGroups: VisibleGroup[] = groups
    .map((group) => {
      if (!isSearching) return { group, items: group.items };
      const groupNameMatches = translateMessage(group.labelMessageKey).toLocaleLowerCase().includes(searchNeedle);
      const items = groupNameMatches
        ? group.items
        : group.items.filter((item) => translateMessage(item.labelMessageKey).toLocaleLowerCase().includes(searchNeedle));
      return { group, items };
    })
    .filter((visibleGroup) => visibleGroup.items.length > 0);

  function isGroupOpen(group: NavigationGroup): boolean {
    if (isSearching) return true;
    const choiceOfThePerson = sidebarPreference.groupOpenStateByGroupCode[group.groupCode];
    if (choiceOfThePerson !== undefined) return choiceOfThePerson;
    return group.items.some((item) => isActive(item.href));
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && searchText !== "") {
      event.preventDefault();
      setSearchText("");
    }
  }

  function renderLink(item: NavigationItem, showLabel: boolean) {
    const Icon = navigationIconByName[item.iconName];
    const active = isActive(item.href);
    const label = translateMessage(item.labelMessageKey);
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        aria-label={showLabel ? undefined : label}
        title={showLabel ? undefined : label}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          !showLabel && "justify-center px-0",
          active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {showLabel && label}
      </Link>
    );
  }

  if (isCollapsed) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex justify-center px-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={translateMessage("navigation.search.label")}
            title={translateMessage("navigation.search.label")}
            onClick={onRequestExpand}
          >
            <Search aria-hidden="true" />
          </Button>
        </div>
        <nav aria-label={translateMessage("navigation.mainMenuLabel")} className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {groups.map((group) => (
            <ul key={group.groupCode} className="space-y-0.5 border-t border-sidebar-border py-2 first:border-t-0">
              {group.items.map((item) => (
                <li key={item.routeKey}>{renderLink(item, false)}</li>
              ))}
            </ul>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative px-3 pt-3">
        <Search aria-hidden="true" className="pointer-events-none absolute start-5.5 top-1/2 mt-1.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          role="searchbox"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          aria-label={translateMessage("navigation.search.label")}
          placeholder={translateMessage("navigation.search.placeholder")}
          autoComplete="off"
          className="ps-8 pe-8"
        />
        {isSearching && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={translateMessage("navigation.search.clear")}
            onClick={() => setSearchText("")}
            className="absolute end-4.5 top-1/2 mt-1.5 -translate-y-1/2"
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </div>

      <nav aria-label={translateMessage("navigation.mainMenuLabel")} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {visibleGroups.length === 0 && (
          <p role="status" className="px-3 py-2 text-sm text-muted-foreground">
            {translateMessage("navigation.search.noResults")}
          </p>
        )}
        {visibleGroups.map(({ group, items }) => {
          const isOpen = isGroupOpen(group);
          return (
            <Collapsible
              key={group.groupCode}
              open={isOpen}
              onOpenChange={(nextOpen) => {
                if (!isSearching) setSidebarGroupOpen(group.groupCode, nextOpen);
              }}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <span>{translateMessage(group.labelMessageKey)}</span>
                <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", !isOpen && "-rotate-90 rtl:rotate-90")} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="space-y-0.5 pt-1 pb-2">
                  {items.map((item) => (
                    <li key={item.routeKey}>{renderLink(item, true)}</li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>
    </div>
  );
}
