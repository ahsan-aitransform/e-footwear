// The route registry entries of the staff screens (module hr-payroll-expenses, Part 16.1). The registry (lib/routing/routeRegistry.ts) spreads this list.
import { ApplicationRoutePatterns } from "@/lib/constants/applicationRoutes";
import { PermissionCodes, PermissionModuleCodes } from "@/lib/contracts/permissionCodes";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { ApplicationRouteDefinition } from "@/lib/routing/routeRegistry";

export const humanResourcesRouteDefinitions: readonly ApplicationRouteDefinition[] = [
  {
    routeKey: "staffList",
    pathPattern: ApplicationRoutePatterns.staffList,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.HUMAN_RESOURCES.STAFF_PROFILES.VIEW),
    navigation: { labelMessageKey: "navigation.item.staffList", iconName: "staff", groupCode: PermissionModuleCodes.HUMAN_RESOURCES, sortOrder: 10 },
  },
  {
    routeKey: "staffDetail",
    pathPattern: ApplicationRoutePatterns.staffDetail,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.HUMAN_RESOURCES.STAFF_PROFILES.VIEW),
  },
  {
    routeKey: "staffTransfers",
    pathPattern: ApplicationRoutePatterns.staffTransfers,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.HUMAN_RESOURCES.STAFF_TRANSFERS.VIEW),
    navigation: { labelMessageKey: "navigation.item.staffTransfers", iconName: "staff", groupCode: PermissionModuleCodes.HUMAN_RESOURCES, sortOrder: 20 },
  },
];
