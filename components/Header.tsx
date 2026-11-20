"use client";

import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client/api";
import { clearSession, loadSession } from "@/lib/client/session";
import { Logo } from "./kit";

// Top bar for every signed-in screen. Shows whether the device is online and signs out
// locally even without a connection, so a shared device is always cleared.
export function Header({
  title,
  who,
  online,
  kind,
}: {
  title: string;
  who: string;
  online: boolean;
  kind: "company" | "platform";
}) {
  const router = useRouter();

  async function signOut() {
    const stored = await loadSession();
    if (stored && online) {
      // Best effort: the server ends the session. Failure does not block the local sign-out.
      await clientApi(kind === "platform" ? "/platform/auth/logout" : "/auth/logout", {
        method: "POST",
        token: stored.token,
      });
    }
    await clearSession();
    router.replace(kind === "platform" ? "/platform/login" : "/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
            <p className="truncate text-xs text-slate-500">{who}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
              online ? "bg-green-50 text-green-700 ring-green-200" : "bg-amber-50 text-amber-800 ring-amber-200"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-green-500" : "bg-amber-500"}`} />
            {online ? "Online" : "Offline"}
          </span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
