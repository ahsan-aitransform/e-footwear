// THE ROUTE REGISTRY: every page of the application is listed here, with who may open it.
// The guards deny by default: a page that exists in app/ but is missing from this list cannot be opened by anyone.
// The menu is generated from this list (filtered by the signed-in person's audience and permissions), so a screen
// appears in the menu if and only if its route is registered.
//
// Adding a screen (see FRONTEND-ARCHITECTURE.md):
//   1. add its path to lib/constants/applicationRoutes.ts (ApplicationRoutes and ApplicationRoutePatterns);
//   2. add an entry above the marker below: audience, required permission codes (from PermissionCodes), menu entry;
//   3. add its message keys (navigation label) to lib/i18n/messages/en and ur.
// The server enforces the same rules; this list only decides what the browser shows.
import { ApplicationRoutePatterns } from "@/lib/constants/applicationRoutes";
import { PermissionCodes, PermissionModuleCodes, type PermissionCode } from "@/lib/contracts/permissionCodes";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import type { PermissionRequirement } from "@/lib/types/permissions";
import { NavigationGroupCodes, type NavigationGroupCode } from "./navigationGroups";
import { masterDataRouteDefinitions } from "@/features/masterData/masterDataRouteDefinitions";
import { partyRouteDefinitions } from "@/features/parties/partyRouteDefinitions";

export type RouteAudience = "public" | "platformAdministrator" | "companyUser";

// The icons a menu entry can use. The components that draw them are in components/layout/navigationIcons.ts.
export type NavigationIconName =
  | "dashboard"
  | "companies"
  | "directory"
  | "users"
  | "settings"
  | "newUser"
  | "activity"
  | "roles"
  | "devices"
  | "sessions"
  | "masterList"
  | "chartOfAccounts"
  | "party"
  | "cash"
  | "product"
  | "barcode"
  | "priceTag";

export type NavigationEntryDefinition = {
  labelMessageKey: MessageKey;
  iconName: NavigationIconName;
  groupCode: NavigationGroupCode;
  sortOrder: number;
};

export type ApplicationRouteDefinition = {
  routeKey: string;
  pathPattern: string;
  audience: RouteAudience;
  // Company users need these permissions (the server checks them again). Ignored for other audiences.
  requiredPermissions?: PermissionRequirement<PermissionCode>;
  // Present only for routes that appear in the menu.
  navigation?: NavigationEntryDefinition;
  // Company users who still have a temporary password may only open routes with this flag.
  allowedWhileTemporaryPassword?: boolean;
  // Reachable only while the temporary password is still set (the forced password change).
  onlyWhileTemporaryPassword?: boolean;
  // Public pages: a person who is already signed in is sent to their own home instead.
  signedInUsersAreRedirected?: boolean;
  // Public pages meant for one audience (a sign-in page): another audience that is signed in gets the
  // "not authorised" notice when they land on it.
  intendedAudience?: Exclude<RouteAudience, "public">;
};

export const applicationRouteRegistry: readonly ApplicationRouteDefinition[] = [
  {
    routeKey: "home",
    pathPattern: ApplicationRoutePatterns.home,
    audience: "public",
  },
  {
    routeKey: "companySignIn",
    pathPattern: ApplicationRoutePatterns.companySignIn,
    audience: "public",
    signedInUsersAreRedirected: true,
    intendedAudience: "companyUser",
  },
  {
    routeKey: "platformSignIn",
    pathPattern: ApplicationRoutePatterns.platformSignIn,
    audience: "public",
    signedInUsersAreRedirected: true,
    intendedAudience: "platformAdministrator",
  },
  {
    routeKey: "changePassword",
    pathPattern: ApplicationRoutePatterns.changePassword,
    audience: "companyUser",
    allowedWhileTemporaryPassword: true,
    onlyWhileTemporaryPassword: true,
  },
  {
    routeKey: "companyDashboard",
    pathPattern: ApplicationRoutePatterns.companyDashboard,
    audience: "companyUser",
    navigation: {
      labelMessageKey: "navigation.item.companyDashboard",
      iconName: "dashboard",
      groupCode: NavigationGroupCodes.general,
      sortOrder: 10,
    },
  },
  {
    routeKey: "platformCompanies",
    pathPattern: ApplicationRoutePatterns.platformCompanies,
    audience: "platformAdministrator",
    navigation: {
      labelMessageKey: "navigation.item.platformCompanies",
      iconName: "companies",
      groupCode: NavigationGroupCodes.platformAdministration,
      sortOrder: 10,
    },
  },
  {
    routeKey: "platformDirectory",
    pathPattern: ApplicationRoutePatterns.platformDirectory,
    audience: "platformAdministrator",
    navigation: {
      labelMessageKey: "navigation.item.platformDirectory",
      iconName: "directory",
      groupCode: NavigationGroupCodes.platformAdministration,
      sortOrder: 20,
    },
  },
  {
    routeKey: "platformCompanyDetail",
    pathPattern: ApplicationRoutePatterns.platformCompanyDetail,
    audience: "platformAdministrator",
  },
  {
    routeKey: "forgotPassword",
    pathPattern: ApplicationRoutePatterns.forgotPassword,
    audience: "public",
    signedInUsersAreRedirected: true,
    intendedAudience: "companyUser",
  },
  {
    routeKey: "resetPassword",
    pathPattern: ApplicationRoutePatterns.resetPassword,
    audience: "public",
    signedInUsersAreRedirected: true,
    intendedAudience: "companyUser",
  },
  {
    routeKey: "usersList",
    pathPattern: ApplicationRoutePatterns.usersList,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.USER_ACCOUNT.VIEW_USERS.VIEW),
    navigation: {
      labelMessageKey: "navigation.item.usersList",
      iconName: "users",
      groupCode: PermissionModuleCodes.USER_ACCOUNT,
      sortOrder: 10,
    },
  },
  {
    routeKey: "usersNew",
    pathPattern: ApplicationRoutePatterns.usersNew,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.USER_ACCOUNT.CREATE_USER.ADD),
    navigation: {
      labelMessageKey: "navigation.item.usersNew",
      iconName: "newUser",
      groupCode: PermissionModuleCodes.USER_ACCOUNT,
      sortOrder: 20,
    },
  },
  {
    routeKey: "userEdit",
    pathPattern: ApplicationRoutePatterns.userEdit,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.USER_ACCOUNT.VIEW_USERS.VIEW),
  },
  {
    routeKey: "usersActivity",
    pathPattern: ApplicationRoutePatterns.usersActivity,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.USER_ACCOUNT.USERS_ACTIVITY.VIEW),
    navigation: {
      labelMessageKey: "navigation.item.usersActivity",
      iconName: "activity",
      groupCode: PermissionModuleCodes.USER_ACCOUNT,
      sortOrder: 30,
    },
  },
  {
    routeKey: "roleTemplates",
    pathPattern: ApplicationRoutePatterns.roleTemplates,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.USER_ACCOUNT.ROLES_AND_PERMISSIONS.VIEW),
    navigation: {
      labelMessageKey: "navigation.item.roleTemplates",
      iconName: "roles",
      groupCode: PermissionModuleCodes.USER_ACCOUNT,
      sortOrder: 40,
    },
  },
  {
    routeKey: "devices",
    pathPattern: ApplicationRoutePatterns.devices,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.DEVICES_AND_POS_TERMINALS.VIEW),
    navigation: {
      labelMessageKey: "navigation.item.devices",
      iconName: "devices",
      groupCode: PermissionModuleCodes.SETTINGS,
      sortOrder: 30,
    },
  },
  {
    routeKey: "accountSessions",
    pathPattern: ApplicationRoutePatterns.accountSessions,
    audience: "companyUser",
    navigation: {
      labelMessageKey: "navigation.item.accountSessions",
      iconName: "sessions",
      groupCode: NavigationGroupCodes.general,
      sortOrder: 90,
    },
  },
  // ---- Settings module (company users): each screen needs its own permission, checked again by the server ----
  {
    routeKey: "companyProfile",
    pathPattern: ApplicationRoutePatterns.companyProfile,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.COMPANY_PROFILE.VIEW),
    navigation: {
      labelMessageKey: "navigation.item.companyProfile",
      iconName: "settings",
      groupCode: PermissionModuleCodes.SETTINGS,
      sortOrder: 10,
    },
  },
  {
    routeKey: "businessInfoAndPreferences",
    pathPattern: ApplicationRoutePatterns.businessInfoAndPreferences,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.PREFERENCE.VIEW),
    navigation: {
      labelMessageKey: "navigation.item.businessInfoAndPreferences",
      iconName: "settings",
      groupCode: PermissionModuleCodes.SETTINGS,
      sortOrder: 20,
    },
  },
  {
    routeKey: "paymentMethods",
    pathPattern: ApplicationRoutePatterns.paymentMethods,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.PAYMENT_METHODS.VIEW),
    navigation: {
      labelMessageKey: "navigation.item.paymentMethods",
      iconName: "settings",
      groupCode: PermissionModuleCodes.SETTINGS,
      sortOrder: 30,
    },
  },
  {
    routeKey: "storeManagement",
    pathPattern: ApplicationRoutePatterns.storeManagement,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.STORE_MANAGEMENT.VIEW),
    navigation: {
      labelMessageKey: "navigation.item.storeManagement",
      iconName: "settings",
      groupCode: PermissionModuleCodes.SETTINGS,
      sortOrder: 40,
    },
  },
  {
    routeKey: "documentNumbering",
    pathPattern: ApplicationRoutePatterns.documentNumbering,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.DOCUMENT_NUMBERING.VIEW),
    navigation: {
      labelMessageKey: "navigation.item.documentNumbering",
      iconName: "settings",
      groupCode: PermissionModuleCodes.SETTINGS,
      sortOrder: 50,
    },
  },
  {
    routeKey: "posTerminals",
    pathPattern: ApplicationRoutePatterns.posTerminals,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.DEVICES_AND_POS_TERMINALS.VIEW),
    navigation: {
      labelMessageKey: "navigation.item.posTerminals",
      iconName: "settings",
      groupCode: PermissionModuleCodes.SETTINGS,
      sortOrder: 60,
    },
  },
  {
    routeKey: "backup",
    pathPattern: ApplicationRoutePatterns.backup,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.BACKUP.VIEW),
    navigation: {
      labelMessageKey: "navigation.item.backup",
      iconName: "settings",
      groupCode: PermissionModuleCodes.SETTINGS,
      sortOrder: 70,
    },
  },
  {
    routeKey: "restore",
    pathPattern: ApplicationRoutePatterns.restore,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.RESTORE.VIEW),
    navigation: {
      labelMessageKey: "navigation.item.restore",
      iconName: "settings",
      groupCode: PermissionModuleCodes.SETTINGS,
      sortOrder: 80,
    },
  },
  {
    // Every company user may set their own language, theme and default store: no permission needed.
    routeKey: "myPreferences",
    pathPattern: ApplicationRoutePatterns.myPreferences,
    audience: "companyUser",
    navigation: {
      labelMessageKey: "navigation.item.myPreferences",
      iconName: "settings",
      groupCode: NavigationGroupCodes.general,
      sortOrder: 90,
    },
  },
  // ---- Platform administration (settings module): platform administrators only ----
  {
    routeKey: "platformPlans",
    pathPattern: ApplicationRoutePatterns.platformPlans,
    audience: "platformAdministrator",
    navigation: {
      labelMessageKey: "navigation.item.platformPlans",
      iconName: "settings",
      groupCode: NavigationGroupCodes.platformAdministration,
      sortOrder: 30,
    },
  },
  {
    routeKey: "platformAuditLog",
    pathPattern: ApplicationRoutePatterns.platformAuditLog,
    audience: "platformAdministrator",
    navigation: {
      labelMessageKey: "navigation.item.platformAuditLog",
      iconName: "directory",
      groupCode: NavigationGroupCodes.platformAdministration,
      sortOrder: 40,
    },
  },
  {
    routeKey: "platformBackup",
    pathPattern: ApplicationRoutePatterns.platformBackup,
    audience: "platformAdministrator",
    navigation: {
      labelMessageKey: "navigation.item.platformBackup",
      iconName: "settings",
      groupCode: NavigationGroupCodes.platformAdministration,
      sortOrder: 50,
    },
  },
  ...masterDataRouteDefinitions,
  ...partyRouteDefinitions,
  ...(
    [
      ["paymentVoucher", ApplicationRoutePatterns.paymentVoucher, PermissionCodes.VOUCHER.PAYMENT_VOUCHER.ADD, "navigation.item.paymentVoucher", "cash", PermissionModuleCodes.VOUCHER, 10],
      ["receiptVoucher", ApplicationRoutePatterns.receiptVoucher, PermissionCodes.VOUCHER.RECEIPT_VOUCHER.ADD, "navigation.item.receiptVoucher", "cash", PermissionModuleCodes.VOUCHER, 20],
      ["expenseVoucher", ApplicationRoutePatterns.expenseVoucher, PermissionCodes.VOUCHER.EXPENSE_VOUCHER.ADD, "navigation.item.expenseVoucher", "cash", PermissionModuleCodes.VOUCHER, 30],
      ["journalVoucher", ApplicationRoutePatterns.journalVoucher, PermissionCodes.VOUCHER.JOURNAL_VOUCHER.ADD, "navigation.item.journalVoucher", "cash", PermissionModuleCodes.VOUCHER, 40],
      ["viewVoucher", ApplicationRoutePatterns.viewVoucher, PermissionCodes.VOUCHER.VIEW_VOUCHER.VIEW, "navigation.item.viewVoucher", "chartOfAccounts", PermissionModuleCodes.VOUCHER, 50],
      ["voucherReport", ApplicationRoutePatterns.voucherReport, PermissionCodes.VOUCHER.VOUCHER_REPORT.VIEW, "navigation.item.voucherReport", "chartOfAccounts", PermissionModuleCodes.VOUCHER, 60],
      ["cashAndBankBalances", ApplicationRoutePatterns.cashAndBankBalances, PermissionCodes.VOUCHER.CASH_AND_BANK_BALANCES.VIEW, "navigation.item.cashAndBankBalances", "cash", PermissionModuleCodes.VOUCHER, 70],
      ["accountingPeriods", ApplicationRoutePatterns.accountingPeriods, PermissionCodes.VOUCHER.ACCOUNTING_PERIODS.VIEW, "navigation.item.accountingPeriods", "settings", PermissionModuleCodes.VOUCHER, 80],
      ["accountLedger", ApplicationRoutePatterns.accountLedger, PermissionCodes.REPORTS.ACCOUNT_LEDGER.VIEW, "navigation.item.accountLedger", "chartOfAccounts", PermissionModuleCodes.REPORTS, 10],
      ["accountBalance", ApplicationRoutePatterns.accountBalance, PermissionCodes.REPORTS.ACCOUNT_BALANCE.VIEW, "navigation.item.accountBalance", "chartOfAccounts", PermissionModuleCodes.REPORTS, 20],
      ["trialBalance", ApplicationRoutePatterns.trialBalance, PermissionCodes.REPORTS.TRIAL_BALANCE.VIEW, "navigation.item.trialBalance", "chartOfAccounts", PermissionModuleCodes.REPORTS, 30],
      ["detailTrialBalance", ApplicationRoutePatterns.detailTrialBalance, PermissionCodes.REPORTS.DETAIL_TRIAL_BALANCE.VIEW, "navigation.item.detailTrialBalance", "chartOfAccounts", PermissionModuleCodes.REPORTS, 40],
      ["generalJournal", ApplicationRoutePatterns.generalJournal, PermissionCodes.REPORTS.GENERAL_JOURNAL.VIEW, "navigation.item.generalJournal", "chartOfAccounts", PermissionModuleCodes.REPORTS, 50],
    ] as const
  ).map(
    ([routeKey, pathPattern, permissionCode, labelMessageKey, iconName, groupCode, sortOrder]): ApplicationRouteDefinition => ({
      routeKey,
      pathPattern,
      audience: "companyUser",
      requiredPermissions: requireAnyPermission(permissionCode),
      navigation: { labelMessageKey, iconName, groupCode, sortOrder },
    }),
  ),
  // <route-registry:end> (shared file: append new routes above this marker, with Edit only)
];
