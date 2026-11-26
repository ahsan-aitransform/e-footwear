"use client";

import { ToneBadge } from "@/components/feedback/ToneBadge";
import { ToneNames, type ToneName } from "@/lib/design/semanticTones";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { PromotionPhaseCodes } from "../types/promotionTypes";

const toneByPhaseCode: Record<string, ToneName> = {
  [PromotionPhaseCodes.running]: ToneNames.success,
  [PromotionPhaseCodes.scheduled]: ToneNames.info,
  [PromotionPhaseCodes.ended]: ToneNames.neutral,
  [PromotionPhaseCodes.inactive]: ToneNames.warning,
};

const messageKeyByPhaseCode: Record<string, MessageKey> = {
  [PromotionPhaseCodes.running]: "promotions.phase.RUNNING",
  [PromotionPhaseCodes.scheduled]: "promotions.phase.SCHEDULED",
  [PromotionPhaseCodes.ended]: "promotions.phase.ENDED",
  [PromotionPhaseCodes.inactive]: "promotions.phase.INACTIVE",
};

// Where a promotion or a deal stands today (running, scheduled, ended, switched off), as a translated pill.
export function PromotionPhaseBadge({ phaseCode }: { phaseCode: string }) {
  const { translateMessage } = useTranslation();
  const messageKey = messageKeyByPhaseCode[phaseCode];
  return <ToneBadge tone={toneByPhaseCode[phaseCode] ?? ToneNames.neutral}>{messageKey ? translateMessage(messageKey) : phaseCode}</ToneBadge>;
}
