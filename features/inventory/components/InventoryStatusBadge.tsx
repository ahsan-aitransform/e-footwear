"use client";

import { ToneBadge } from "@/components/feedback/ToneBadge";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { presentStatusCode } from "../logic/inventoryStatusPresentation";

// The status of an inventory document or case as a small pill (the colour comes from the tone, never from the screen).
export function InventoryStatusBadge({ statusCode }: { statusCode: string }) {
  const { translateMessage } = useTranslation();
  const presentation = presentStatusCode(statusCode);
  return <ToneBadge tone={presentation.tone}>{translateMessage(presentation.messageKey)}</ToneBadge>;
}
