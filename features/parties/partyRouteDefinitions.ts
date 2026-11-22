// The route registry entries of the Party chapter (docx chapter 3): parties, account detail, promises and the cash screens.
// The registry (lib/routing/routeRegistry.ts) spreads this list; keeping the entries here leaves the shared file small.
import { ApplicationRoutePatterns } from "@/lib/constants/applicationRoutes";
import { PermissionCodes, PermissionModuleCodes, type PermissionCode } from "@/lib/contracts/permissionCodes";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import type { ApplicationRouteDefinition, NavigationIconName } from "@/lib/routing/routeRegistry";

function partyScreenRoute(
  routeKey: string,
  pathPattern: string,
  viewPermissionCode: PermissionCode,
  navigation: { labelMessageKey: MessageKey; iconName: NavigationIconName; sortOrder: number } | undefined,
): ApplicationRouteDefinition {
  return {
    routeKey,
    pathPattern,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(viewPermissionCode),
    navigation: navigation ? { ...navigation, groupCode: PermissionModuleCodes.PARTY } : undefined,
  };
}

export const partyRouteDefinitions: readonly ApplicationRouteDefinition[] = [
  // New Party needs the Add permission to open; editing an existing party (the :partyId page) needs View and the form needs Edit to save.
  partyScreenRoute("newParty", ApplicationRoutePatterns.newParty, PermissionCodes.PARTY.NEW_PARTY.ADD,
    { labelMessageKey: "navigation.item.newParty", iconName: "party", sortOrder: 10 }),
  partyScreenRoute("editParty", ApplicationRoutePatterns.editParty, PermissionCodes.PARTY.NEW_PARTY.VIEW, undefined),
  partyScreenRoute("manageParties", ApplicationRoutePatterns.manageParties, PermissionCodes.PARTY.VIEW_PARTY.VIEW,
    { labelMessageKey: "navigation.item.manageParties", iconName: "party", sortOrder: 20 }),
  partyScreenRoute("searchParties", ApplicationRoutePatterns.searchParties, PermissionCodes.PARTY.SEARCH_PARTY.VIEW,
    { labelMessageKey: "navigation.item.searchParties", iconName: "party", sortOrder: 30 }),
  partyScreenRoute("partyAccountDetail", ApplicationRoutePatterns.partyAccountDetail, PermissionCodes.PARTY.ACCOUNT_DETAIL.VIEW,
    { labelMessageKey: "navigation.item.partyAccountDetail", iconName: "chartOfAccounts", sortOrder: 40 }),
  partyScreenRoute("customerPromises", ApplicationRoutePatterns.customerPromises, PermissionCodes.PARTY.PROMISE.VIEW,
    { labelMessageKey: "navigation.item.customerPromises", iconName: "party", sortOrder: 50 }),
  partyScreenRoute("cashCalculator", ApplicationRoutePatterns.cashCalculator, PermissionCodes.PARTY.CASH_CALCULATOR.VIEW,
    { labelMessageKey: "navigation.item.cashCalculator", iconName: "cash", sortOrder: 60 }),
  partyScreenRoute("viewCashDetails", ApplicationRoutePatterns.viewCashDetails, PermissionCodes.PARTY.VIEW_CASH_DETAIL.VIEW,
    { labelMessageKey: "navigation.item.viewCashDetails", iconName: "cash", sortOrder: 70 }),
];
