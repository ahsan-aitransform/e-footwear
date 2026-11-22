"use client";

import { useEffect } from "react";
import { SESSION_REVERIFICATION_MINIMUM_INTERVAL_MILLISECONDS } from "@/lib/constants/sessionTiming";
import { reportBrowserConnectivity, verifySessionWithServer } from "./sessionStore";

let lastVerificationRequestedAtTimestamp = 0;

function requestVerification(): void {
  lastVerificationRequestedAtTimestamp = Date.now();
  void verifySessionWithServer();
}

// Mounted by every guarded layout. Re-validates the stored session with the server:
//  - when the layout mounts (a person opening the application or entering a guarded area);
//  - when the connection returns (the "online" browser event);
//  - when the tab becomes visible again, at most once per SESSION_REVERIFICATION_MINIMUM_INTERVAL_MILLISECONDS.
// It also keeps the online/offline flag of the session store in step with the browser.
export function useSessionVerification(): void {
  useEffect(() => {
    requestVerification();

    const handleOnline = () => {
      reportBrowserConnectivity(true);
      requestVerification();
    };
    const handleOffline = () => reportBrowserConnectivity(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastVerificationRequestedAtTimestamp < SESSION_REVERIFICATION_MINIMUM_INTERVAL_MILLISECONDS) return;
      requestVerification();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
