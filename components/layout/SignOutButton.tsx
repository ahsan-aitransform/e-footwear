"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { signInRouteForAudience } from "@/lib/routing/homeRoute";
import { endSession, getSessionSnapshot } from "@/lib/session/sessionStore";

// Signs out. The server is told when it can be reached, but the device is always cleared, so a shared device is
// never left holding someone's session.
export function SignOutButton() {
  const router = useRouter();
  const { translateMessage } = useTranslation();

  async function signOut() {
    const state = getSessionSnapshot();
    const wasPlatformAdministrator =
      state.phase === "authenticated" && state.storedSession.currentSession.audience === "PLATFORM_ADMINISTRATOR";
    await endSession({ notifyServer: true });
    router.replace(signInRouteForAudience(wasPlatformAdministrator ? "platformAdministrator" : "companyUser"));
  }

  return (
    <Button type="button" variant="outline" onClick={signOut}>
      {translateMessage("common.signOut")}
    </Button>
  );
}
