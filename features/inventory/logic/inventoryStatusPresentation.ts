// What each status code of the inventory documents says and which tone (meaning-colour) it gets. One place, so every list and detail shows a status the same way.
import { ToneNames, type ToneName } from "@/lib/design/semanticTones";
import type { MessageKey } from "@/lib/i18n/messageKeys";

type StatusPresentation = { messageKey: MessageKey; tone: ToneName };

const presentationByStatusCode: Record<string, StatusPresentation> = {
  DRAFT: { messageKey: "inventory.status.draft", tone: ToneNames.info },
  POSTED: { messageKey: "inventory.status.posted", tone: ToneNames.success },
  CANCELLED: { messageKey: "inventory.status.cancelled", tone: ToneNames.neutral },
  SHIPPED: { messageKey: "inventory.status.shipped", tone: ToneNames.warning },
  RECEIVING: { messageKey: "inventory.status.receiving", tone: ToneNames.warning },
  COMPLETED: { messageKey: "inventory.status.completed", tone: ToneNames.success },
  COMPLETED_WITH_MISSING: { messageKey: "inventory.status.completedWithMissing", tone: ToneNames.danger },
  REQUESTED: { messageKey: "inventory.status.requested", tone: ToneNames.warning },
  APPROVED: { messageKey: "inventory.status.approved", tone: ToneNames.success },
  REJECTED: { messageKey: "inventory.status.rejected", tone: ToneNames.danger },
  OPEN: { messageKey: "inventory.status.open", tone: ToneNames.warning },
  ASSIGNED: { messageKey: "inventory.status.assigned", tone: ToneNames.neutral },
  FOUND: { messageKey: "inventory.status.found", tone: ToneNames.success },
  WRITTEN_OFF: { messageKey: "inventory.status.writtenOff", tone: ToneNames.neutral },
};

export function presentStatusCode(statusCode: string): StatusPresentation {
  return presentationByStatusCode[statusCode] ?? { messageKey: "inventory.status.unknown", tone: ToneNames.neutral };
}

const kindMessageKeyByCode: Record<string, MessageKey> = {
  MANUAL: "inventory.kind.manual",
  COUNT_UPDATE: "inventory.kind.countUpdate",
  REVERSAL: "inventory.kind.reversal",
  AUDIT_ADJUSTMENT: "inventory.kind.auditAdjustment",
};

export function kindMessageKey(kindCode: string): MessageKey {
  return kindMessageKeyByCode[kindCode] ?? "inventory.kind.manual";
}

const reasonMessageKeyByCode: Record<string, MessageKey> = {
  DAMAGED: "inventory.claim.reason.damaged",
  DEFECTIVE: "inventory.claim.reason.defective",
  LOST: "inventory.claim.reason.lost",
  OTHER: "inventory.claim.reason.other",
};

export function claimReasonMessageKey(reasonCode: string): MessageKey {
  return reasonMessageKeyByCode[reasonCode] ?? "inventory.claim.reason.other";
}

const bearerMessageKeyByCode: Record<string, MessageKey> = {
  COMPANY: "inventory.discrepancy.bearer.company",
  SENDER_STORE: "inventory.discrepancy.bearer.senderStore",
  RECEIVER_STORE: "inventory.discrepancy.bearer.receiverStore",
};

export function bearerMessageKey(bearerCode: string): MessageKey {
  return bearerMessageKeyByCode[bearerCode] ?? "inventory.discrepancy.bearer.company";
}
