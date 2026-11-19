import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getT } from "@/i18n/server";
import { can, getMe } from "@/lib/server/data";
import { LanguageSwitch, SignOutButton } from "@/components/ShellControls";
import { AppHeader, type NavItem } from "@/components/AppHeader";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { t, locale } = await getT();
  const me = await getMe();
  if (!me.ok) redirect("/login?expired=1");

  // Navigation hides what the user cannot open; the API enforces the same permission on every request.
  const nav: NavItem[] = [
    { href: "/", label: t("nav.dashboard"), show: true },
    { href: "/stores", label: t("nav.stores"), show: can(me.data, "Settings.Stores") },
    { href: "/users", label: t("nav.users"), show: can(me.data, "UserAccount.ViewUser") },
  ].filter((n) => n.show).map(({ href, label }) => ({ href, label }));

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        brand={t("app.name")}
        items={nav}
        userLabel={me.data.displayName ?? me.data.userName}
        controls={<><LanguageSwitch current={locale} /><SignOutButton /></>}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
