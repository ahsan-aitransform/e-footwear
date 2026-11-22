"use client";

import { toneForStatusCode } from "@/lib/design/semanticTones";
import { findStatusMessageKey } from "@/lib/i18n/statusMessageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ToneBadge } from "./ToneBadge";

// Shows an API status code (ACTIVE, LOCKED, ...) as a translated pill in its tone.
export function StatusBadge({ statusCode }: { statusCode: string }) {
  const { translateMessage } = useTranslation();
  const messageKey = findStatusMessageKey(statusCode);
  return <ToneBadge tone={toneForStatusCode(statusCode)}>{messageKey ? translateMessage(messageKey) : statusCode}</ToneBadge>;
}
