"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { cn } from "@/lib/utils";

// A spinner with a label. role="status" lets screen readers announce it.
export function LoadingIndicator({
  labelMessageKey = "common.loading",
  className,
}: {
  labelMessageKey?: MessageKey;
  className?: string;
}) {
  const { translateMessage } = useTranslation();
  return (
    <div role="status" className={cn("flex items-center gap-3 py-8 text-sm text-muted-foreground", className)}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
      {translateMessage(labelMessageKey)}...
    </div>
  );
}

// Fills the screen: shown by the route guards while the session is being checked.
export function FullPageLoadingIndicator({ labelMessageKey = "shell.verifyingSession" }: { labelMessageKey?: MessageKey }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
      <LoadingIndicator labelMessageKey={labelMessageKey} />
    </div>
  );
}
