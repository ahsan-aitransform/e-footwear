"use client";

import { ToneBadge } from "@/components/feedback/ToneBadge";
import { ToneNames, type ToneName } from "@/lib/design/semanticTones";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { PayrollStatusCodes } from "../types/payrollTypes";

const toneByStatusCode: Record<string, ToneName> = {
  [PayrollStatusCodes.draft]: ToneNames.warning,
  [PayrollStatusCodes.approved]: ToneNames.info,
  [PayrollStatusCodes.paid]: ToneNames.success,
  [PayrollStatusCodes.cancelled]: ToneNames.neutral,
};

const messageKeyByStatusCode: Record<string, MessageKey> = {
  [PayrollStatusCodes.draft]: "payroll.status.DRAFT",
  [PayrollStatusCodes.approved]: "payroll.status.APPROVED",
  [PayrollStatusCodes.paid]: "payroll.status.PAID",
  [PayrollStatusCodes.cancelled]: "payroll.status.CANCELLED",
};

// The status of a salary sheet or of one line on it, as a translated pill. A status this build does not know shows its raw code.
export function PayrollStatusBadge({ statusCode }: { statusCode: string }) {
  const { translateMessage } = useTranslation();
  const messageKey = messageKeyByStatusCode[statusCode];
  return <ToneBadge tone={toneByStatusCode[statusCode] ?? ToneNames.neutral}>{messageKey ? translateMessage(messageKey) : statusCode}</ToneBadge>;
}
