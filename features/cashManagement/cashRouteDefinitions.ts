// The route registry entries of the cash screens (Cash Calculator and View Cash Detail). The registry spreads this list.
import { ApplicationRoutePatterns } from "@/lib/constants/applicationRoutes";
import { PermissionCodes, PermissionModuleCodes } from "@/lib/contracts/permissionCodes";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { ApplicationRouteDefinition } from "@/lib/routing/routeRegistry";

export const cashRouteDefinitions: readonly ApplicationRouteDefinition[] = [
  {
    routeKey: "cashCalculator",
    pathPattern: ApplicationRoutePatterns.cashCalculator,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.CASH_MANAGEMENT.CASH_CALCULATOR.VIEW),
    navigation: { labelMessageKey: "navigation.item.cashCalculator", iconName: "cash", groupCode: PermissionModuleCodes.CASH_MANAGEMENT, sortOrder: 10 },
  },
  {
    routeKey: "viewCashDetails",
    pathPattern: ApplicationRoutePatterns.viewCashDetails,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.CASH_MANAGEMENT.VIEW_CASH_DETAIL.VIEW),
    navigation: { labelMessageKey: "navigation.item.viewCashDetails", iconName: "cash", groupCode: PermissionModuleCodes.CASH_MANAGEMENT, sortOrder: 20 },
  },
];
