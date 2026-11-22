"use client";

import { toneForRoleCode } from "@/lib/design/roleTones";
import { findRoleMessageKey } from "@/lib/i18n/roleMessageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ToneBadge } from "./ToneBadge";

export function RoleBadge({ roleCode }: { roleCode: string }) {
  const { translateMessage } = useTranslation();
  const messageKey = findRoleMessageKey(roleCode);
  return <ToneBadge tone={toneForRoleCode(roleCode)}>{messageKey ? translateMessage(messageKey) : roleCode}</ToneBadge>;
}
