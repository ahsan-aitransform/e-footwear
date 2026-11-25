// The route registry entries of the customers screens. The registry (lib/routing/routeRegistry.ts) spreads this list.
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
    navigation: navigation ? { ...navigation, groupCode: PermissionModuleCodes.CUSTOMERS } : undefined,
  };
}

export const customerRouteDefinitions: readonly ApplicationRouteDefinition[] = [
  // The new page needs the Add permission to open; editing an existing one (the edit page) needs View and the form needs Edit to save.
  screenRoute("newCustomer", ApplicationRoutePatterns.newCustomer, PermissionCodes.CUSTOMERS.NEW_CUSTOMER.ADD,
    { labelMessageKey: "navigation.item.newCustomer", iconName: "contact", sortOrder: 10 }),
  screenRoute("editCustomer", ApplicationRoutePatterns.editCustomer, PermissionCodes.CUSTOMERS.NEW_CUSTOMER.VIEW, undefined),
  screenRoute("viewCustomers", ApplicationRoutePatterns.viewCustomers, PermissionCodes.CUSTOMERS.VIEW_CUSTOMERS.VIEW,
    { labelMessageKey: "navigation.item.viewCustomers", iconName: "contact", sortOrder: 20 }),
  screenRoute("searchCustomers", ApplicationRoutePatterns.searchCustomers, PermissionCodes.CUSTOMERS.SEARCH_CUSTOMER.VIEW,
    { labelMessageKey: "navigation.item.searchCustomers", iconName: "contact", sortOrder: 30 }),
  screenRoute("customerAccountDetail", ApplicationRoutePatterns.customerAccountDetail, PermissionCodes.CUSTOMERS.CUSTOMER_ACCOUNT_DETAIL.VIEW,
    { labelMessageKey: "navigation.item.customerAccountDetail", iconName: "chartOfAccounts", sortOrder: 40 }),
  screenRoute("customerPromises", ApplicationRoutePatterns.customerPromises, PermissionCodes.CUSTOMERS.PROMISE.VIEW,
    { labelMessageKey: "navigation.item.customerPromises", iconName: "contact", sortOrder: 50 }),
];
