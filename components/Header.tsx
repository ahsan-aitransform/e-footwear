"use client";

import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client/api";
import { clearSession, loadSession } from "@/lib/client/session";

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
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-base font-semibold text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-500">
            Signed in as {who} ·{" "}
            <span className={online ? "text-green-700" : "text-amber-700"}>
              {online ? "Online" : "Offline: showing saved data"}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
