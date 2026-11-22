"use client";

import { useSessionState } from "@/lib/session/useSessionState";
import { decideRouteAccess, type RouteAccessDecision } from "./routeAccessDecision";
import type { RouteAudience } from "./routeRegistry";

export type RouteAccessState =
  // The session is not known yet (reading it from the device, or checking it with the server).
  // Nothing of a guarded page may be shown in this state.
  | { status: "checking" }
  | { status: "decided"; decision: RouteAccessDecision };

// Combines the pure rules (decideRouteAccess) with the live session. A stored session counts only after the server
// confirmed it (or the device is offline, then the stored copy is used): nothing is decided from an unverified session
// while the server can answer.
export function useRouteAccessDecision(pathname: string, layoutAudience?: RouteAudience): RouteAccessState {
  const sessionState = useSessionState();

  if (sessionState.phase === "initializing") return { status: "checking" };
  if (sessionState.phase === "anonymous") {
    return { status: "decided", decision: decideRouteAccess({ pathname, session: null, layoutAudience }) };
  }
  if (sessionState.verification === "pending") return { status: "checking" };

  return {
    status: "decided",
    decision: decideRouteAccess({ pathname, session: sessionState.storedSession.currentSession, layoutAudience }),
  };
}
