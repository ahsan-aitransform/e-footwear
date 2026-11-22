import { describe, expect, it } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { applicationRouteRegistry } from "./routeRegistry";

const routeByKey = (routeKey: string) => {
  const route = applicationRouteRegistry.find((candidate) => candidate.routeKey === routeKey);
  if (!route) throw new Error(`Route ${routeKey} is not registered`);
  return route;
};

describe("routes of the settings module", () => {
  it.each([
    ["companyProfile", PermissionCodes.SETTINGS.COMPANY_PROFILE.VIEW],
    ["businessInfoAndPreferences", PermissionCodes.SETTINGS.PREFERENCE.VIEW],
    ["paymentMethods", PermissionCodes.SETTINGS.PAYMENT_METHODS.VIEW],
    ["storeManagement", PermissionCodes.SETTINGS.STORE_MANAGEMENT.VIEW],
    ["documentNumbering", PermissionCodes.SETTINGS.DOCUMENT_NUMBERING.VIEW],
    ["posTerminals", PermissionCodes.SETTINGS.DEVICES_AND_POS_TERMINALS.VIEW],
    ["backup", PermissionCodes.SETTINGS.BACKUP.VIEW],
    ["restore", PermissionCodes.SETTINGS.RESTORE.VIEW],
  ])("%s is for company users who have %s", (routeKey, permissionCode) => {
    const route = routeByKey(routeKey);
    expect(route.audience).toBe("companyUser");
    expect(route.requiredPermissions?.permissionCodes).toEqual([permissionCode]);
  });

  it("lets every company user open their own preferences without a permission", () => {
    const route = routeByKey("myPreferences");
    expect(route.audience).toBe("companyUser");
    expect(route.requiredPermissions).toBeUndefined();
  });

  it.each(["platformPlans", "platformAuditLog", "platformBackup"])("%s is for platform administrators only", (routeKey) => {
    const route = routeByKey(routeKey);
    expect(route.audience).toBe("platformAdministrator");
    expect(route.pathPattern.startsWith("/platform/")).toBe(true);
  });
});
