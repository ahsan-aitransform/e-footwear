import { describe, expect, it } from "vitest";
import {
  findMissingPermissionCodes,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  requireAllPermissions,
  requireAnyPermission,
  satisfiesPermissionRequirement,
} from "./permissionChecks";

const granted = new Set(["PRODUCTS.NEW_PRODUCT.VIEW", "PRODUCTS.NEW_PRODUCT.ADD"]);

describe("permission checks", () => {
  it("hasPermission / hasAnyPermission / hasAllPermissions", () => {
    expect(hasPermission(granted, "PRODUCTS.NEW_PRODUCT.VIEW")).toBe(true);
    expect(hasPermission(granted, "PRODUCTS.NEW_PRODUCT.DELETE")).toBe(false);
    expect(hasAnyPermission(granted, ["PRODUCTS.NEW_PRODUCT.DELETE", "PRODUCTS.NEW_PRODUCT.ADD"])).toBe(true);
    expect(hasAnyPermission(granted, ["PRODUCTS.NEW_PRODUCT.DELETE"])).toBe(false);
    expect(hasAllPermissions(granted, ["PRODUCTS.NEW_PRODUCT.VIEW", "PRODUCTS.NEW_PRODUCT.ADD"])).toBe(true);
    expect(hasAllPermissions(granted, ["PRODUCTS.NEW_PRODUCT.VIEW", "PRODUCTS.NEW_PRODUCT.DELETE"])).toBe(false);
  });

  it("an empty list means 'any' is false and 'all' is true, but an empty requirement needs nothing", () => {
    expect(hasAnyPermission(granted, [])).toBe(false);
    expect(hasAllPermissions(granted, [])).toBe(true);
    expect(satisfiesPermissionRequirement(new Set(), undefined)).toBe(true);
    expect(satisfiesPermissionRequirement(new Set(), { mode: "any", permissionCodes: [] })).toBe(true);
  });

  it("satisfiesPermissionRequirement follows the mode", () => {
    expect(satisfiesPermissionRequirement(granted, requireAnyPermission("PRODUCTS.NEW_PRODUCT.ADD", "PRODUCTS.NEW_PRODUCT.DELETE"))).toBe(true);
    expect(satisfiesPermissionRequirement(granted, requireAllPermissions("PRODUCTS.NEW_PRODUCT.ADD", "PRODUCTS.NEW_PRODUCT.DELETE"))).toBe(false);
  });

  it("findMissingPermissionCodes lists exactly what is missing", () => {
    const requirement = requireAllPermissions("PRODUCTS.NEW_PRODUCT.ADD", "PRODUCTS.NEW_PRODUCT.DELETE", "PRODUCTS.NEW_PRODUCT.EDIT");
    expect(findMissingPermissionCodes(granted, requirement)).toEqual(["PRODUCTS.NEW_PRODUCT.DELETE", "PRODUCTS.NEW_PRODUCT.EDIT"]);
    expect(findMissingPermissionCodes(granted, undefined)).toEqual([]);
  });
});
