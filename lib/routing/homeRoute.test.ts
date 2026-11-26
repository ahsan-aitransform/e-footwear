import { describe, expect, it } from "vitest";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { buildCompanyUserSession } from "@/tests/support/sessionFixtures";
import { homeRouteForSession } from "./homeRoute";

const customers = PermissionCodes.CUSTOMERS.VIEW_CUSTOMERS.VIEW;
const cashCalculator = PermissionCodes.CASH_MANAGEMENT.CASH_CALCULATOR.VIEW;
const newSale = PermissionCodes.INVOICE.NEW_SALE.VIEW;

const homeFor = (...grantedPermissionCodes: string[]) => homeRouteForSession(buildCompanyUserSession({ grantedPermissionCodes }));

describe("the start page of a company user", () => {
  it("is New Sale for everyone who may open it", () => {
    expect(homeFor(customers, cashCalculator, newSale)).toBe(ApplicationRoutes.newSale);
  });
  it("is the first screen other than Customers without New Sale", () => {
    expect(homeFor(customers, cashCalculator)).toBe(ApplicationRoutes.cashCalculator);
  });
  it("is Customers only when there is no other screen", () => {
    expect(homeFor(customers)).toBe(ApplicationRoutes.viewCustomers);
  });
  it("stays on / without any screen", () => {
    expect(homeFor()).toBe(ApplicationRoutes.home);
  });
});
