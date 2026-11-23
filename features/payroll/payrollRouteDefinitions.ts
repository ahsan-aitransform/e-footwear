// The route registry entries of the payroll screens (module hr-payroll-expenses, docx 3.8 and 3.9, Part 16.3 and the two payroll reports).
// The docx puts the salary sheets in the Party menu, so they keep that group; salary payments belong to Human Resources; the reports to Reports.
import { ApplicationRoutePatterns } from "@/lib/constants/applicationRoutes";
import { PermissionCodes, PermissionModuleCodes } from "@/lib/contracts/permissionCodes";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { ApplicationRouteDefinition } from "@/lib/routing/routeRegistry";

export const payrollRouteDefinitions: readonly ApplicationRouteDefinition[] = [
  {
    routeKey: "newSalarySheet",
    pathPattern: ApplicationRoutePatterns.newSalarySheet,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.PARTY.NEW_SALARY_SHEET.VIEW),
    navigation: { labelMessageKey: "navigation.item.newSalarySheet", iconName: "payroll", groupCode: PermissionModuleCodes.PARTY, sortOrder: 80 },
  },
  {
    routeKey: "viewSalarySheet",
    pathPattern: ApplicationRoutePatterns.viewSalarySheet,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.PARTY.VIEW_SALARY_SHEET.VIEW),
    navigation: { labelMessageKey: "navigation.item.viewSalarySheet", iconName: "payroll", groupCode: PermissionModuleCodes.PARTY, sortOrder: 90 },
  },
  {
    routeKey: "salaryPayments",
    pathPattern: ApplicationRoutePatterns.salaryPayments,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.HUMAN_RESOURCES.SALARY_PAYMENTS.VIEW),
    navigation: { labelMessageKey: "navigation.item.salaryPayments", iconName: "payroll", groupCode: PermissionModuleCodes.HUMAN_RESOURCES, sortOrder: 30 },
  },
  {
    routeKey: "staffSalaryReport",
    pathPattern: ApplicationRoutePatterns.staffSalaryReport,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.REPORTS.STAFF_SALARY_REPORT.VIEW),
    navigation: { labelMessageKey: "navigation.item.staffSalaryReport", iconName: "payroll", groupCode: PermissionModuleCodes.REPORTS, sortOrder: 200 },
  },
  {
    routeKey: "salaryOutstandingReport",
    pathPattern: ApplicationRoutePatterns.salaryOutstandingReport,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.REPORTS.SALARY_OUTSTANDING_REPORT.VIEW),
    navigation: { labelMessageKey: "navigation.item.salaryOutstandingReport", iconName: "payroll", groupCode: PermissionModuleCodes.REPORTS, sortOrder: 210 },
  },
];
