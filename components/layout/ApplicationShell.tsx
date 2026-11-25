"use client";

import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { QuickActionToolbar } from "@/features/security/components/QuickActionToolbar";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { setSidebarCollapsed } from "@/lib/layout/sidebarPreferenceStore";
import { useSidebarPreference } from "@/lib/layout/useSidebarPreference";
import { useCurrentSession, useIsOnline } from "@/lib/session/useSessionState";
import { cn } from "@/lib/utils";
import { ApplicationNavigation } from "./ApplicationNavigation";
import { BrandLogo } from "./BrandLogo";
import { ConnectivityBadge } from "./ConnectivityBadge";
import { LanguageSwitch } from "./LanguageSwitch";
import { SignOutButton } from "./SignOutButton";
import { StoreSelector } from "./StoreSelector";
import { ThemeSwitch } from "./ThemeSwitch";

// The frame of every signed-in screen: sidebar menu (a slide-in drawer on small screens), header with the store selector,
// connection status, language, theme and sign-out, and the page content. Used by the (company) and (platform) layouts.
export function ApplicationShell({ children }: { children: ReactNode }) {
  const { translateMessage } = useTranslation();
  const session = useCurrentSession();
  const isOnline = useIsOnline();
  const { isCollapsed: isSidebarCollapsed } = useSidebarPreference();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Escape closes the drawer.
  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isMenuOpen]);

  const areaTitle =
    session?.audience === "PLATFORM_ADMINISTRATOR"
      ? translateMessage("shell.platformAreaTitle")
      : (session?.companyName ?? translateMessage("common.applicationName"));

  const brand = (
    <div className="flex items-center gap-3 px-5 py-4">
      <BrandLogo />
      <span className="text-base font-semibold tracking-tight">{translateMessage("common.applicationName")}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only z-[200] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {translateMessage("common.skipToContent")}
      </a>

      {/* Pinned to the screen height (sticky + h-screen + self-start) so the menu inside scrolls on its own while the page scrolls.
          Collapsed, it is a narrow strip of icons; the choice is remembered (lib/layout/sidebarPreferenceStore.ts). */}
      <aside
        id="application-sidebar"
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col self-start border-e bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex print:hidden",
          isSidebarCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className={cn("flex items-center", isSidebarCollapsed ? "flex-col gap-2 px-2 py-3" : "gap-3 py-4 ps-5 pe-3")}>
          <BrandLogo />
          {!isSidebarCollapsed && (
            <span className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">{translateMessage("common.applicationName")}</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={translateMessage(isSidebarCollapsed ? "navigation.expandSidebar" : "navigation.collapseSidebar")}
            title={translateMessage(isSidebarCollapsed ? "navigation.expandSidebar" : "navigation.collapseSidebar")}
            aria-expanded={!isSidebarCollapsed}
            aria-controls="application-sidebar"
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="rtl:rotate-180" /> : <PanelLeftClose className="rtl:rotate-180" />}
          </Button>
        </div>
        <ApplicationNavigation isCollapsed={isSidebarCollapsed} onRequestExpand={() => setSidebarCollapsed(false)} />
      </aside>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            aria-label={translateMessage("navigation.closeMenu")}
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside className="relative flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <div className="flex items-center justify-between pe-3">
              {brand}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={translateMessage("navigation.closeMenu")}
                onClick={() => setIsMenuOpen(false)}
              >
                <X />
              </Button>
            </div>
            <ApplicationNavigation onNavigate={() => setIsMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur print:hidden">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label={translateMessage("navigation.openMenu")}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{areaTitle}</p>
              {session && (
                <p className="truncate text-xs text-muted-foreground">
                  {translateMessage("shell.userMenuLabel", { name: session.displayName })}
                </p>
              )}
            </div>
            <StoreSelector />
            <ConnectivityBadge />
            <LanguageSwitch />
            <ThemeSwitch />
            <SignOutButton />
          </div>
          {session?.audience === "COMPANY_USER" && <QuickActionToolbar />}
          {!isOnline && (
            <p className="border-t bg-tone-warning-background px-4 py-1.5 text-xs text-tone-warning-foreground sm:px-6">
              {translateMessage("shell.offlineHint")}
            </p>
          )}
        </header>
        <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
