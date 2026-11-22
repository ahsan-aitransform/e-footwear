"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
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

  useEffect(() => {
    if (sessionState.phase === "initializing") return;
    router.replace(
      sessionState.phase === "authenticated"
        ? homeRouteForSession(sessionState.storedSession.currentSession)
        : ApplicationRoutes.companySignIn,
    );
  }, [sessionState, router]);

  return <FullPageLoadingIndicator labelMessageKey="common.loading" />;
}
