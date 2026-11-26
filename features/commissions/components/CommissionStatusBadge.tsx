"use client";

import { ToneBadge } from "@/components/feedback/ToneBadge";
import { ToneNames, type ToneName } from "@/lib/design/semanticTones";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CommissionEntryStatusCodes } from "../types/commissionTypes";

const toneByStatusCode: Record<string, ToneName> = {
  [CommissionEntryStatusCodes.pending]: ToneNames.warning,
  [CommissionEntryStatusCodes.approved]: ToneNames.info,
  [CommissionEntryStatusCodes.onHold]: ToneNames.warning,
  [CommissionEntryStatusCodes.paid]: ToneNames.success,
  [CommissionEntryStatusCodes.cancelled]: ToneNames.neutral,
};

const messageKeyByStatusCode: Record<string, MessageKey> = {
  [CommissionEntryStatusCodes.pending]: "commissions.status.PENDING",
  [CommissionEntryStatusCodes.approved]: "commissions.status.APPROVED",
  [CommissionEntryStatusCodes.onHold]: "commissions.status.ON_HOLD",
  [CommissionEntryStatusCodes.paid]: "commissions.status.PAID",
  [CommissionEntryStatusCodes.cancelled]: "commissions.status.CANCELLED",
};

// Where a commission entry stands, as a translated pill. A status this build does not know shows its raw code.
export function CommissionStatusBadge({ statusCode }: { statusCode: string }) {
  const { translateMessage } = useTranslation();
  const messageKey = messageKeyByStatusCode[statusCode];
  return <ToneBadge tone={toneByStatusCode[statusCode] ?? ToneNames.neutral}>{messageKey ? translateMessage(messageKey) : statusCode}</ToneBadge>;
}
