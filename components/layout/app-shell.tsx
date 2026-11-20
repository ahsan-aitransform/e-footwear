"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { Loading, ToastProvider, cx, useToast } from "@/components/ui/core";
import { SessionProvider, useMe } from "@/components/session";
import { NAV, allowed } from "@/lib/nav";
import { api } from "@/lib/api";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SessionProvider>
        <Shell>{children}</Shell>
      </SessionProvider>
    </ToastProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { me, can } = useMe();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [openAt, setOpenAt] = useState<string | null>(null);        // the mobile drawer closes by itself when the route changes
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);
  const [pick, setPick] = useState<{ path: string; label: string | null } | null>(null);

  const groups = useMemo(
    () => NAV.map((g) => ({ ...g, items: g.items.filter((i) => allowed(can, i)) })).filter((g) => g.items.length > 0),
    [can],
  );

  const activeLabel = groups.find((x) => x.items.some((i) => i.href.split("?")[0] === pathname))?.label ?? null;
  const expanded = pick && pick.path === pathname ? pick.label : activeLabel;
  const setExpanded = (label: string | null) => setPick({ path: pathname, label });

  // The server forces a password change on first sign-in (administrator-issued passwords).
  useEffect(() => {
    if (me.mustChangePassword && pathname !== "/account/password") router.replace("/account/password");
  }, [me.mustChangePassword, pathname, router]);

  const switchStore = async (storeId: number) => {
    try {
      const r = await fetch("/api/session/switch-store", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ storeId }) });
      if (!r.ok) throw new Error((await r.json()).title ?? "Could not switch store");
      window.location.reload();
    } catch (e) {
      toast((e as Error).message, "red");
    }
  };

  const logout = async () => {
    await fetch("/api/session/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };


  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-primary-700 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-primary-700"><Icon name="store" size={18} /></span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{me.company.name}</div>
          <div className="truncate text-xs text-primary-100">FootwearPOS</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {groups.map((g) => {
          const single = g.items.length === 1;
          const active = g.items.some((i) => i.href.split("?")[0] === pathname);
          if (single)
            return (
              <Link key={g.label} href={g.items[0].href} className={cx("mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium", active ? "bg-white text-primary-800" : "text-white hover:bg-primary-700")}>
                <Icon name={g.icon} size={17} />{g.label}
              </Link>
            );
          const isOpen = expanded === g.label;
          return (
            <div key={g.label} className="mb-0.5">
              <button aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : g.label)}
                className={cx("flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium", active ? "bg-primary-700 text-white" : "text-white hover:bg-primary-700")}>
                <Icon name={g.icon} size={17} /><span className="flex-1">{g.label}</span>
                <Icon name="chevdown" size={14} className={cx("transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <ul className="ml-4 mt-0.5 border-l border-primary-500 pl-2">
                  {g.items.map((i) => {
                    const on = i.href.split("?")[0] === pathname && (typeof window === "undefined" || !i.href.includes("?") || window.location.search === i.href.slice(i.href.indexOf("?")));
                    return (
                      <li key={i.href}>
                        <Link href={i.href} className={cx("block rounded px-2.5 py-1.5 text-[13px]", on ? "bg-white font-medium text-primary-800" : "text-primary-100 hover:bg-primary-700 hover:text-white")}>{i.label}</Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 bg-primary-800 lg:block">{sidebar}</aside>
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-primary-800">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 border-b border-line bg-white">
          <div className="flex items-center gap-2 px-3 py-2 sm:px-5">
            <button aria-label="Open menu" className="rounded p-1.5 hover:bg-surface lg:hidden" onClick={() => setOpen(true)}><Icon name="menu" size={20} /></button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Icon name="store" size={16} className="text-primary-600" />
              {me.stores.length > 1 ? (
                <select aria-label="Working store" value={me.currentStore.id} onChange={(e) => switchStore(Number(e.target.value))} className="h-8 max-w-[10rem] rounded-md border border-line-strong bg-white px-2 text-[13px] font-medium sm:max-w-xs">
                  {me.stores.map((s) => <option key={s.id} value={s.id}>{s.isHeadOffice ? `${s.name} (all)` : s.name}</option>)}
                </select>
              ) : <span className="truncate text-[13px] font-medium">{me.currentStore.name}</span>}
            </div>
            <span className="hidden text-[13px] text-muted sm:inline">{me.fullName}</span>
            <button onClick={logout} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-primary-700 hover:bg-primary-50"><Icon name="logout" size={15} /> Sign out</button>
          </div>
        </header>
        <main className="flex-1 px-3 py-4 sm:px-5">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}

/** Used by screens that need to refresh the session after changing their own data. */
export { api };
