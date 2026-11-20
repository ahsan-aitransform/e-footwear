"use client";

import { useEffect } from "react";

// Registers the offline service worker (public/sw.js). Production builds only, so development hot reload is not affected.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}
