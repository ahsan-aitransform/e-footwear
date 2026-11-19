"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BrandMark } from "@/components/ui";

export type NavItem = { href: string; label: string };

/** Responsive app header: inline nav on desktop, collapsible menu on small screens. */
export function AppHeader({ brand, items, userLabel, controls }: {
  brand: string;
  items: NavItem[];
  userLabel: string;
  controls: ReactNode;
}): ReactNode {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string): boolean => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  const link = (n: NavItem, mobile: boolean): ReactNode => {
    const active = isActive(n.href);
    const base = mobile ? "block rounded-lg px-3 py-2 text-base" : "rounded-lg px-3 py-2 text-sm";
    return (
      <Link
        key={n.href}
        href={n.href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={`${base} font-medium transition ${active ? "bg-brand-600 text-white" : "text-ink hover:bg-brand-50 hover:text-brand-700"}`}
      >
        {n.label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label={brand}><BrandMark name={brand} /></Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">{items.map((n) => link(n, false))}</nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <span className="badge-brand max-w-48 truncate">{userLabel}</span>
          {controls}
        </div>

        <button
          type="button"
          className="btn-secondary btn-sm md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-brand-100 bg-white px-4 pb-4 pt-2 md:hidden">
          <nav aria-label="Main" className="flex flex-col gap-1">{items.map((n) => link(n, true))}</nav>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-brand-50 pt-3">
            <span className="badge-brand">{userLabel}</span>
            {controls}
          </div>
        </div>
      )}
    </header>
  );
}
