import { PermissionModuleCodes, type PermissionModuleCode } from "@/lib/contracts/permissionCodes";
import type { MessageKey } from "@/lib/i18n/messageKeys";

// The groups of the navigation menu. The module groups are the modules of the permission catalog (the docx 1.2 tree:
// User Account, Products, Customers, Invoice, Orders, Voucher, Reports, Settings); two extra groups hold the screens that
// need no permission module.
export const NavigationGroupCodes = {
  general: "general",
  platformAdministration: "platformAdministration",
} as const;

// RESTRICTED_OPERATIONS holds the legacy flat permission codes the database functions check; it has no screens, so no group.
export type NavigationGroupCode =
  | (typeof NavigationGroupCodes)[keyof typeof NavigationGroupCodes]
  | Exclude<PermissionModuleCode, "RESTRICTED_OPERATIONS">;

type NavigationGroupDefinition = { sortOrder: number; labelMessageKey: MessageKey };

export const navigationGroupDefinitions: Record<NavigationGroupCode, NavigationGroupDefinition> = {
  [NavigationGroupCodes.general]: { sortOrder: 0, labelMessageKey: "navigation.group.general" },
  [NavigationGroupCodes.platformAdministration]: { sortOrder: 5, labelMessageKey: "navigation.group.platformAdministration" },
  [PermissionModuleCodes.DASHBOARDS]: { sortOrder: 2, labelMessageKey: "navigation.group.DASHBOARDS" },
  [PermissionModuleCodes.CUSTOMERS]: { sortOrder: 10, labelMessageKey: "navigation.group.CUSTOMERS" },
  [PermissionModuleCodes.CASH_MANAGEMENT]: { sortOrder: 12, labelMessageKey: "navigation.group.CASH_MANAGEMENT" },
  [PermissionModuleCodes.PRODUCTS]: { sortOrder: 20, labelMessageKey: "navigation.group.PRODUCTS" },
  [PermissionModuleCodes.INVENTORY]: { sortOrder: 25, labelMessageKey: "navigation.group.INVENTORY" },
  [PermissionModuleCodes.INVOICE]: { sortOrder: 30, labelMessageKey: "navigation.group.INVOICE" },
  [PermissionModuleCodes.ORDERS]: { sortOrder: 40, labelMessageKey: "navigation.group.ORDERS" },
  [PermissionModuleCodes.VENDORS]: { sortOrder: 45, labelMessageKey: "navigation.group.VENDORS" },
  [PermissionModuleCodes.VOUCHER]: { sortOrder: 50, labelMessageKey: "navigation.group.VOUCHER" },
  [PermissionModuleCodes.EXPENSES]: { sortOrder: 52, labelMessageKey: "navigation.group.EXPENSES" },
  [PermissionModuleCodes.HUMAN_RESOURCES]: { sortOrder: 54, labelMessageKey: "navigation.group.HUMAN_RESOURCES" },
  [PermissionModuleCodes.COMMISSIONS]: { sortOrder: 56, labelMessageKey: "navigation.group.COMMISSIONS" },
  [PermissionModuleCodes.PROMOTIONS]: { sortOrder: 58, labelMessageKey: "navigation.group.PROMOTIONS" },
  [PermissionModuleCodes.REPORTS]: { sortOrder: 60, labelMessageKey: "navigation.group.REPORTS" },
  [PermissionModuleCodes.OFFLINE_SYNCHRONIZATION]: { sortOrder: 62, labelMessageKey: "navigation.group.OFFLINE_SYNCHRONIZATION" },
  [PermissionModuleCodes.INTEGRATIONS]: { sortOrder: 64, labelMessageKey: "navigation.group.INTEGRATIONS" },
  [PermissionModuleCodes.SETTINGS]: { sortOrder: 70, labelMessageKey: "navigation.group.SETTINGS" },
  [PermissionModuleCodes.USER_ACCOUNT]: { sortOrder: 80, labelMessageKey: "navigation.group.USER_ACCOUNT" },
};
