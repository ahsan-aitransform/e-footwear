import { describe, expect, it } from "vitest";
import { buildCompanyUserSession, buildPlatformAdministratorSession } from "@/tests/support/sessionFixtures";
import { buildNavigationTree } from "./buildNavigationTree";
import { NavigationGroupCodes } from "./navigationGroups";
import { applicationRouteRegistry, type ApplicationRouteDefinition } from "./routeRegistry";

const registryWithPermissionScreens: ApplicationRouteDefinition[] = [
  ...applicationRouteRegistry,
  {
    routeKey: "testProducts",
    pathPattern: "/products",
    audience: "companyUser",
    requiredPermissions: { mode: "any", permissionCodes: ["PRODUCTS.VIEW_PRODUCTS.VIEW"] },
    navigation: { labelMessageKey: "navigation.item.companyDashboard", iconName: "dashboard", groupCode: "PRODUCTS", sortOrder: 10 },
  },
];

describe("buildNavigationTree", () => {
  it("shows a company user the dashboard and nothing that belongs to the platform", () => {
    const groups = buildNavigationTree(buildCompanyUserSession());
    const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
    // Other modules add personal screens that need no permission (own preferences, own sessions), so the list is not fixed.
    expect(hrefs).toContain("/dashboard");
    expect(hrefs.some((href) => href.startsWith("/platform"))).toBe(false);
    expect(groups.map((group) => group.groupCode)).toEqual([NavigationGroupCodes.general]);
  });

  it("shows a platform administrator only the platform entries, in order", () => {
    const groups = buildNavigationTree(buildPlatformAdministratorSession());
    expect(groups).toHaveLength(1);
    expect(groups[0].groupCode).toBe(NavigationGroupCodes.platformAdministration);
    const hrefs = groups[0].items.map((item) => item.href);
    expect(hrefs.slice(0, 2)).toEqual(["/platform", "/platform/directory"]);
    expect(hrefs.every((href) => href === "/platform" || href.startsWith("/platform/"))).toBe(true);
  });

  it("hides a screen the person has no permission for and shows it once the permission is granted", () => {
    const without = buildNavigationTree(buildCompanyUserSession(), registryWithPermissionScreens);
    expect(without.flatMap((group) => group.items.map((item) => item.href))).not.toContain("/products");

    const withPermission = buildNavigationTree(
      buildCompanyUserSession({ grantedPermissionCodes: ["PRODUCTS.VIEW_PRODUCTS.VIEW"] }),
      registryWithPermissionScreens,
    );
    expect(withPermission.map((group) => group.groupCode)).toEqual([NavigationGroupCodes.general, "PRODUCTS"]);
  });

  it("shows no menu at all to a person who still has a temporary password", () => {
    expect(buildNavigationTree(buildCompanyUserSession({ mustChangePassword: true }))).toEqual([]);
  });

  it("never lists a route with a dynamic segment", () => {
    const hrefs = buildNavigationTree(buildPlatformAdministratorSession()).flatMap((group) => group.items.map((item) => item.href));
    expect(hrefs.some((href) => href.includes("["))).toBe(false);
  });
});
