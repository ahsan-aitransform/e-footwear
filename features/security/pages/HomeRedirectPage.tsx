"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AccessDeniedScreen } from "@/components/feedback/AccessDeniedScreen";
import { FullPageLoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { homeRouteForSession } from "@/lib/routing/homeRoute";
import { initializeSession } from "@/lib/session/sessionStore";
import { useSessionState } from "@/lib/session/useSessionState";

// The entry point ("/"). It runs in the browser, so it also works offline: the stored session decides where to go.
// The page it sends the person to runs its own guard, which verifies the session with the server.
export function HomeRedirectPage() {
  const router = useRouter();
  const sessionState = useSessionState();

  useEffect(() => {
    void initializeSession();
  }, []);

  const destination =
    sessionState.phase === "initializing"
      ? null
      : sessionState.phase === "authenticated"
        ? homeRouteForSession(sessionState.storedSession.currentSession)
        : ApplicationRoutes.companySignIn;
  // A signed-in person whose menu is empty has nowhere to go: say so instead of redirecting to "/" again.
  const hasNowhereToGo = destination === ApplicationRoutes.home;

  useEffect(() => {
    if (destination === null || hasNowhereToGo) return;
    router.replace(destination);
  }, [destination, hasNowhereToGo, router]);

  if (hasNowhereToGo) return <AccessDeniedScreen reason="missingPermission" />;
  return <FullPageLoadingIndicator labelMessageKey="common.loading" />;
}
