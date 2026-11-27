// The route registry entries of the staff screens. The registry (lib/routing/routeRegistry.ts) spreads this list.
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
    navigation: navigation ? { ...navigation, groupCode: PermissionModuleCodes.HUMAN_RESOURCES } : undefined,
  };
}

export const staffRouteDefinitions: readonly ApplicationRouteDefinition[] = [
  // The new page needs the Add permission to open; editing an existing one (the edit page) needs View and the form needs Edit to save.
  screenRoute("newStaffMember", ApplicationRoutePatterns.newStaffMember, PermissionCodes.HUMAN_RESOURCES.NEW_STAFF.ADD,
    { labelMessageKey: "navigation.item.newStaffMember", iconName: "contact", sortOrder: 11 }),
  screenRoute("editStaffMember", ApplicationRoutePatterns.editStaffMember, PermissionCodes.HUMAN_RESOURCES.NEW_STAFF.VIEW, undefined),
  screenRoute("viewStaffMembers", ApplicationRoutePatterns.viewStaffMembers, PermissionCodes.HUMAN_RESOURCES.VIEW_STAFF.VIEW,
    { labelMessageKey: "navigation.item.viewStaffMembers", iconName: "contact", sortOrder: 12 }),
  screenRoute("staffAccountDetail", ApplicationRoutePatterns.staffAccountDetail, PermissionCodes.HUMAN_RESOURCES.STAFF_ACCOUNT_DETAIL.VIEW,
    { labelMessageKey: "navigation.item.staffAccountDetail", iconName: "chartOfAccounts", sortOrder: 14 }),
];
