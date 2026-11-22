// A guard that redirects someone away from a page they may not open leaves a short notice for the next page,
// which shows it once ("You are not authorised to open that page."). It lives in sessionStorage, so it never
// outlives the tab.
import { SessionStorageKeys } from "@/lib/constants/browserStorageKeys";
import type { MessageKey } from "@/lib/i18n/messageKeys";

export function rememberPendingAccessNotice(messageKey: MessageKey): void {
  try {
    window.sessionStorage.setItem(SessionStorageKeys.pendingAccessNotice, messageKey);
  } catch {
    // storage unavailable: the redirect still happens, only the explanation is lost
  }
}

export function consumePendingAccessNotice(): MessageKey | null {
  try {
    const value = window.sessionStorage.getItem(SessionStorageKeys.pendingAccessNotice);
    if (!value) return null;
    window.sessionStorage.removeItem(SessionStorageKeys.pendingAccessNotice);
    return value as MessageKey;
  } catch {
    return null;
  }
}
