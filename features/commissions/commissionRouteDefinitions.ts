// The route registry entries of the commission screens (module hr-payroll-expenses slice 2, Part 16.2): plans and entries belong to the Commissions
// module, the two reports to Reports.
import { ApplicationRoutePatterns } from "@/lib/constants/applicationRoutes";
import { PermissionCodes, PermissionModuleCodes } from "@/lib/contracts/permissionCodes";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { ApplicationRouteDefinition } from "@/lib/routing/routeRegistry";

export const commissionRouteDefinitions: readonly ApplicationRouteDefinition[] = [
  {
    routeKey: "commissionPlans",
    pathPattern: ApplicationRoutePatterns.commissionPlans,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.COMMISSIONS.COMMISSION_PLANS.VIEW),
    navigation: { labelMessageKey: "navigation.item.commissionPlans", iconName: "commission", groupCode: PermissionModuleCodes.COMMISSIONS, sortOrder: 10 },
  },
  {
    routeKey: "commissionEntries",
    pathPattern: ApplicationRoutePatterns.commissionEntries,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.COMMISSIONS.COMMISSION_ENTRIES.VIEW),
    navigation: { labelMessageKey: "navigation.item.commissionEntries", iconName: "commission", groupCode: PermissionModuleCodes.COMMISSIONS, sortOrder: 20 },
  },
  {
    routeKey: "commissionReport",
    pathPattern: ApplicationRoutePatterns.commissionReport,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.REPORTS.COMMISSION_REPORT.VIEW),
    navigation: { labelMessageKey: "navigation.item.commissionReport", iconName: "commission", groupCode: PermissionModuleCodes.REPORTS, sortOrder: 220 },
  },
  {
    routeKey: "commissionAccrualAndPaymentReport",
    pathPattern: ApplicationRoutePatterns.commissionAccrualAndPaymentReport,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.REPORTS.COMMISSION_ACCRUAL_AND_PAYMENT_REPORT.VIEW),
    navigation: { labelMessageKey: "navigation.item.commissionAccrualAndPaymentReport", iconName: "commission", groupCode: PermissionModuleCodes.REPORTS, sortOrder: 230 },
  },
];
