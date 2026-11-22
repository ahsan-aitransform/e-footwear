"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getLanguageSnapshot } from "@/lib/i18n/languageStore";
import { translateMessageForLanguage } from "@/lib/i18n/translateMessage";
import { consumePendingAccessNotice } from "@/lib/routing/pendingAccessNotice";
import { showToast } from "@/lib/toast/toastStore";

// After a guard redirected someone away from a page they may not open, the page they land on shows the explanation once
// ("You are not authorised to open that page."). Mounted once in app/layout.tsx.
export function AccessNoticeAnnouncer() {
  const pathname = usePathname();

  useEffect(() => {
    const messageKey = consumePendingAccessNotice();
    if (messageKey) showToast(translateMessageForLanguage(getLanguageSnapshot(), messageKey), "warning");
  }, [pathname]);

  return null;
}
