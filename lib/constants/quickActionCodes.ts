// SINGLE SOURCE OF TRUTH FOR THE QUICK-ACTION TOOLBAR (docx 1.1 "Standard Menu"). The codes mirror QuickActionCodes in the API
// (EFootwear.Domain/Security/QuickActionCodes.cs); an administrator ticks which of them a user sees.
//
// A button appears only when its screen exists (is registered in the route registry) AND the person may open it. So a code can be
// listed here before its screen is built: it simply does not show yet. When a module builds the screen, it adds one line to
// quickActionRouteByCode above the marker.
import { ApplicationRoutes } from "./applicationRoutes";

export const QuickActionCodes = {
  dashboard: "DASHBOARD",
  newSale: "NEW_SALE",
  saleReturn: "SALE_RETURN",
  newPurchase: "NEW_PURCHASE",
  viewInvoices: "VIEW_INVOICES",
  recovery: "RECOVERY",
  payment: "PAYMENT",
  expense: "EXPENSE",
  accountLedger: "ACCOUNT_LEDGER",
  backup: "BACKUP",
} as const;

export type QuickActionCode = (typeof QuickActionCodes)[keyof typeof QuickActionCodes];

// In the order the toolbar shows them.
export const QUICK_ACTION_CODES_IN_TOOLBAR_ORDER: readonly QuickActionCode[] = Object.values(QuickActionCodes);

export const quickActionRouteByCode: Partial<Record<QuickActionCode, string>> = {
  [QuickActionCodes.dashboard]: ApplicationRoutes.companyDashboard,
  [QuickActionCodes.backup]: ApplicationRoutes.backup,
  // <quick-action-routes:end> (shared file: append the route of a quick action above this marker, with Edit only)
};

export function isQuickActionCode(code: string): code is QuickActionCode {
  return (QUICK_ACTION_CODES_IN_TOOLBAR_ORDER as readonly string[]).includes(code);
}
