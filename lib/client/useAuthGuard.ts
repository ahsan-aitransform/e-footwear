"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "./api";
import { clearSession, isCompanySession, isPlatformSession, loadSession, saveSession, type StoredSession } from "./session";
import type { CompanyMe, PlatformMe } from "../types";

export type GuardKind = "company" | "platform";

export type GuardState =
  | { status: "loading" }
  | { status: "ready"; session: StoredSession; online: boolean };

const LOGIN_PATH: Record<GuardKind, string> = { company: "/login", platform: "/platform/login" };

/**
 * Guards a screen on the client.
 * - No stored session: send the person to the matching sign-in page.
 * - Wrong kind of session (a company user on the platform screens, or the reverse): send them to their own area.
 * - Temporary company password: send to /change-password.
 * - Online: re-check the token with the server, which catches revoked, expired or blocked sessions.
 * - Offline: keep working from the stored session. Screens block the actions that need the server.
 */
export function useAuthGuard(kind: GuardKind): GuardState & { recheck: () => Promise<void> } {
  const router = useRouter();
  const [state, setState] = useState<GuardState>({ status: "loading" });

  const check = useCallback(async () => {
    const stored = await loadSession();
    if (!stored) return router.replace(LOGIN_PATH[kind]);

    if (kind === "company" && isPlatformSession(stored)) return router.replace("/platform");
    if (kind === "platform" && isCompanySession(stored)) return router.replace("/dashboard");
    if (kind === "company" && isCompanySession(stored) && stored.me.mustChangePassword) {
      return router.replace("/change-password");
    }

    const result = await clientApi<CompanyMe | PlatformMe>("/auth/me", { token: stored.token });
    if (result.ok) {
      const fresh: StoredSession = { ...stored, me: result.data };
      await saveSession(fresh);
      if (kind === "company" && isCompanySession(fresh) && fresh.me.mustChangePassword) {
        return router.replace("/change-password");
      }
      setState({ status: "ready", session: fresh, online: true });
      return;
    }
    if (result.offline) {
      setState({ status: "ready", session: stored, online: false });
      return;
    }
    // Refused by the server (expired, revoked, blocked): forget it and sign in again.
    await clearSession();
    router.replace(LOGIN_PATH[kind]);
  }, [kind, router]);

  useEffect(() => {
    void check();
    const onOnline = () => void check();
    const onOffline = () => setState((s) => (s.status === "ready" ? { ...s, online: false } : s));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [check]);

  return { ...state, recheck: check };
}
