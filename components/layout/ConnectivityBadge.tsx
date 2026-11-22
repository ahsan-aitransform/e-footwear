"use client";

import { toneBadgeClassNames, toneDotClassNames, ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useIsOnline } from "@/lib/session/useSessionState";
import { cn } from "@/lib/utils";

// Online / offline status of this device (Part 23.8). "Offline" means the server could not be reached; the stored
// session and cached screens keep working, and actions that need the server are paused.
export function ConnectivityBadge() {
  const isOnline = useIsOnline();
  const { translateMessage } = useTranslation();
  const tone = isOnline ? ToneNames.success : ToneNames.warning;
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        toneBadgeClassNames[tone],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", toneDotClassNames[tone])} />
      {translateMessage(isOnline ? "shell.connectionOnline" : "shell.connectionOffline")}
    </span>
  );
}
