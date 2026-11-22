"use client";

import { useSyncExternalStore } from "react";
import type { CurrentSessionResponse, SessionStoreState } from "@/lib/types/session";
import { getServerSessionSnapshot, getSessionSnapshot, subscribeToSession } from "./sessionStore";

// The session of this browser (see sessionStore.ts). Re-renders the component when the session changes.
export function useSessionState(): SessionStoreState {
  return useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot);
}

// Who is signed in, or null when nobody is (or the stored session is still being read).
export function useCurrentSession(): CurrentSessionResponse | null {
  const state = useSessionState();
  return state.phase === "authenticated" ? state.storedSession.currentSession : null;
}

// Whether the device can reach the server, as far as the last request and the browser events know.
export function useIsOnline(): boolean {
  const state = useSessionState();
  return state.phase === "authenticated" ? state.isOnline : true;
}
