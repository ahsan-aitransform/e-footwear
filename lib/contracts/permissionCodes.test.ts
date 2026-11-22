import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generatePermissionCodesSource, validatePermissionCatalog } from "@/scripts/permissionCodesGenerator.mjs";
import { PermissionCodes, allPermissionCodes, isKnownPermissionCode } from "./permissionCodes";
import snapshot from "./permissionCatalog.snapshot.json";

describe("permission contract", () => {
  it("lib/contracts/permissionCodes.ts is generated from the snapshot and not stale (run: npm run contracts:generate)", () => {
    const checkedIn = readFileSync(join(process.cwd(), "lib", "contracts", "permissionCodes.ts"), "utf8");
    expect(checkedIn).toBe(generatePermissionCodesSource(snapshot));
  });

  it("the snapshot is a valid catalog with unique codes; screen codes are <MODULE>.<SCREEN>.<ACTION>, the legacy restricted operations are flat", () => {
    expect(() => validatePermissionCatalog(snapshot)).not.toThrow();
    expect(new Set(allPermissionCodes).size).toBe(allPermissionCodes.length);
    for (const moduleDefinition of snapshot.modules) {
      for (const screen of moduleDefinition.screens) {
        for (const action of screen.actions) {
          if (moduleDefinition.moduleCode === "RESTRICTED_OPERATIONS") expect(action.permissionCode).toMatch(/^[A-Z][A-Z0-9_]*$/);
          else expect(action.permissionCode).toMatch(/^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]*$/);
        }
      }
    }
  });

  it("contains the screens of the docx 1.2 permission tree and the legacy restricted operations of the backend", () => {
    expect(PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW).toBe("PRODUCTS.NEW_PRODUCT.VIEW");
    expect(PermissionCodes.INVOICE.NEW_SALE.CHANGE_SELLING_PRICE).toBe("INVOICE.NEW_SALE.CHANGE_SELLING_PRICE");
    expect(PermissionCodes.INVOICE.NEW_SALE.GIVE_DISCOUNT).toBe("INVOICE.NEW_SALE.GIVE_DISCOUNT");
    expect(PermissionCodes.PRODUCTS.CLAIM_APPROVAL.APPROVE).toBe("PRODUCTS.CLAIM_APPROVAL.APPROVE");
    expect(PermissionCodes.REPORTS.TRIAL_BALANCE.EXPORT).toBe("REPORTS.TRIAL_BALANCE.EXPORT");
    expect(PermissionCodes.RESTRICTED_OPERATIONS.SALES.SALE_CREATE).toBe("SALE_CREATE");
    const moduleCodes = snapshot.modules.map((moduleDefinition) => moduleDefinition.moduleCode);
    expect(moduleCodes.slice(0, 8)).toEqual(["USER_ACCOUNT", "PRODUCTS", "PARTY", "INVOICE", "ORDERS", "VOUCHER", "REPORTS", "SETTINGS"]);
  });

  it("isKnownPermissionCode accepts catalog codes and rejects anything else", () => {
    expect(isKnownPermissionCode("PRODUCTS.NEW_PRODUCT.VIEW")).toBe(true);
    expect(isKnownPermissionCode("PRODUCTS.NEW_PRODUCT.FLY")).toBe(false);
    expect(isKnownPermissionCode("")).toBe(false);
  });

  it("the validator rejects a code that does not match its module, screen and action", () => {
    const broken = structuredClone(snapshot);
    broken.modules[0].screens[0].actions[0].permissionCode = "USER_ACCOUNT.NEW_USER.WRONG";
    expect(() => validatePermissionCatalog(broken)).toThrow();
  });
});
