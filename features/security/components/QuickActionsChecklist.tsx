"use client";

import { QUICK_ACTION_CODES_IN_TOOLBAR_ORDER, type QuickActionCode } from "@/lib/constants/quickActionCodes";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";

const messageKeyByQuickActionCode: Record<QuickActionCode, MessageKey> = {
  DASHBOARD: "securityManagement.quickAction.DASHBOARD",
  NEW_SALE: "securityManagement.quickAction.NEW_SALE",
  SALE_RETURN: "securityManagement.quickAction.SALE_RETURN",
  NEW_PURCHASE: "securityManagement.quickAction.NEW_PURCHASE",
  VIEW_INVOICES: "securityManagement.quickAction.VIEW_INVOICES",
  RECOVERY: "securityManagement.quickAction.RECOVERY",
  PAYMENT: "securityManagement.quickAction.PAYMENT",
  EXPENSE: "securityManagement.quickAction.EXPENSE",
  ACCOUNT_LEDGER: "securityManagement.quickAction.ACCOUNT_LEDGER",
  BACKUP: "securityManagement.quickAction.BACKUP",
};

export function quickActionMessageKey(code: QuickActionCode): MessageKey {
  return messageKeyByQuickActionCode[code];
}

// The "Standard Menu" of the original Create New User screen: which toolbar buttons the user sees. The selection is kept in the
// fixed toolbar order, so the order saved is always the order shown.
export function QuickActionsChecklist({
  selectedActionCodes,
  onChange,
}: {
  selectedActionCodes: readonly string[];
  onChange: (nextActionCodes: string[]) => void;
}) {
  const { translateMessage } = useTranslation();

  function toggle(actionCode: QuickActionCode) {
    const nextSelection = new Set(selectedActionCodes);
    if (nextSelection.has(actionCode)) nextSelection.delete(actionCode);
    else nextSelection.add(actionCode);
    onChange(QUICK_ACTION_CODES_IN_TOOLBAR_ORDER.filter((code) => nextSelection.has(code)));
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{translateMessage("securityManagement.quickActions.legend")}</legend>
      <p className="text-xs text-muted-foreground">{translateMessage("securityManagement.quickActions.hint")}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTION_CODES_IN_TOOLBAR_ORDER.map((actionCode) => (
          <label
            key={actionCode}
            className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
          >
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={selectedActionCodes.includes(actionCode)}
              onChange={() => toggle(actionCode)}
            />
            {translateMessage(messageKeyByQuickActionCode[actionCode])}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
