// The route registry entry of the customers screen. The registry (lib/routing/routeRegistry.ts) spreads this list.
import { ApplicationRoutePatterns } from "@/lib/constants/applicationRoutes";
import { PermissionCodes, PermissionModuleCodes } from "@/lib/contracts/permissionCodes";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { ApplicationRouteDefinition } from "@/lib/routing/routeRegistry";

export const customerRouteDefinitions: readonly ApplicationRouteDefinition[] = [
  {
    routeKey: "viewCustomers",
    pathPattern: ApplicationRoutePatterns.viewCustomers,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.CUSTOMERS.VIEW_CUSTOMERS.VIEW),
    navigation: { labelMessageKey: "navigation.item.viewCustomers", iconName: "contact", groupCode: PermissionModuleCodes.CUSTOMERS, sortOrder: 10 },
  },
];
