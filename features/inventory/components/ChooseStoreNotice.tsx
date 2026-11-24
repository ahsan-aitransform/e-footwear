"use client";

import { InlineNotice } from "@/components/feedback/InlineNotice";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";

// Shown instead of a store-bound screen while no store is chosen in the top bar.
export function ChooseStoreNotice() {
  const { translateMessage } = useTranslation();
  return <InlineNotice tone={ToneNames.info}>{translateMessage("inventory.common.chooseStore")}</InlineNotice>;
}
