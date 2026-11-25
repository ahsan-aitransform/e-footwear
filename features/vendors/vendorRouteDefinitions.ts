// The route registry entries of the vendors screens. The registry (lib/routing/routeRegistry.ts) spreads this list.
import { ApplicationRoutePatterns } from "@/lib/constants/applicationRoutes";
import { PermissionCodes, PermissionModuleCodes, type PermissionCode } from "@/lib/contracts/permissionCodes";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import type { ApplicationRouteDefinition, NavigationIconName } from "@/lib/routing/routeRegistry";

function screenRoute(
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
    navigation: navigation ? { ...navigation, groupCode: PermissionModuleCodes.VENDORS } : undefined,
  };
}

export const vendorRouteDefinitions: readonly ApplicationRouteDefinition[] = [
  // The new page needs the Add permission to open; editing an existing one (the edit page) needs View and the form needs Edit to save.
  screenRoute("newVendor", ApplicationRoutePatterns.newVendor, PermissionCodes.VENDORS.NEW_VENDOR.ADD,
    { labelMessageKey: "navigation.item.newVendor", iconName: "contact", sortOrder: 10 }),
  screenRoute("editVendor", ApplicationRoutePatterns.editVendor, PermissionCodes.VENDORS.NEW_VENDOR.VIEW, undefined),
  screenRoute("viewVendors", ApplicationRoutePatterns.viewVendors, PermissionCodes.VENDORS.VIEW_VENDORS.VIEW,
    { labelMessageKey: "navigation.item.viewVendors", iconName: "contact", sortOrder: 12 }),
  screenRoute("searchVendors", ApplicationRoutePatterns.searchVendors, PermissionCodes.VENDORS.SEARCH_VENDOR.VIEW,
    { labelMessageKey: "navigation.item.searchVendors", iconName: "contact", sortOrder: 13 }),
  screenRoute("vendorAccountDetail", ApplicationRoutePatterns.vendorAccountDetail, PermissionCodes.VENDORS.VENDOR_ACCOUNT_DETAIL.VIEW,
    { labelMessageKey: "navigation.item.vendorAccountDetail", iconName: "chartOfAccounts", sortOrder: 14 }),
];
