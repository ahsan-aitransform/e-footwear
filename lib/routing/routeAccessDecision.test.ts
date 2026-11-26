import { describe, expect, it } from "vitest";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { buildCompanyUserSession, buildPlatformAdministratorSession } from "@/tests/support/sessionFixtures";
import { decideRouteAccess } from "./routeAccessDecision";
import { applicationRouteRegistry, type ApplicationRouteDefinition } from "./routeRegistry";

// The route guard matrix: audience x signed-in x permission x temporary password.
// These are the rules that keep a normal person out of the super-admin routes.

const companyUser = buildCompanyUserSession();
const companyUserWithTemporaryPassword = buildCompanyUserSession({ mustChangePassword: true });
const platformAdministrator = buildPlatformAdministratorSession();

describe("platform (super admin) routes", () => {
  const platformPaths = [
    ApplicationRoutes.platformCompanies,
    ApplicationRoutes.platformDirectory,
    ApplicationRoutes.platformCompanyDetail("0197c3a0-5555-7000-8000-000000000005"),
  ];

  it.each(platformPaths)("%s: nobody signed in is sent to the platform sign-in page", (pathname) => {
    expect(decideRouteAccess({ pathname, session: null, layoutAudience: "platformAdministrator" })).toEqual({
      kind: "redirect",
      destination: ApplicationRoutes.platformSignIn,
      reason: "unauthenticated",
    });
  });

  it.each(platformPaths)("%s: a company user is sent to their home page with a not-authorised notice", (pathname) => {
    expect(decideRouteAccess({ pathname, session: companyUser, layoutAudience: "platformAdministrator" })).toEqual({
      kind: "redirect",
      destination: ApplicationRoutes.home,
      reason: "wrongAudience",
      noticeMessageKey: "accessNotice.notAuthorisedForPage",
    });
  });

  it.each(platformPaths)("%s: a company user with a temporary password is sent to change it, not to the platform", (pathname) => {
    const decision = decideRouteAccess({ pathname, session: companyUserWithTemporaryPassword, layoutAudience: "platformAdministrator" });
    expect(decision).toMatchObject({ kind: "redirect", destination: ApplicationRoutes.changePassword, reason: "wrongAudience" });
  });

  it.each(platformPaths)("%s: a platform administrator may open it", (pathname) => {
    expect(decideRouteAccess({ pathname, session: platformAdministrator, layoutAudience: "platformAdministrator" }).kind).toBe("allow");
  });
});

describe("company routes", () => {
  it("nobody signed in is sent to the company sign-in page", () => {
    expect(decideRouteAccess({ pathname: ApplicationRoutes.usersList, session: null, layoutAudience: "companyUser" })).toEqual({
      kind: "redirect",
      destination: ApplicationRoutes.companySignIn,
      reason: "unauthenticated",
    });
  });

  it("a platform administrator is sent to /platform", () => {
    expect(
      decideRouteAccess({ pathname: ApplicationRoutes.usersList, session: platformAdministrator, layoutAudience: "companyUser" }),
    ).toMatchObject({ kind: "redirect", destination: ApplicationRoutes.platformCompanies, reason: "wrongAudience" });
  });

  it("a company user may open a page they have the permission for", () => {
    const withPermission = buildCompanyUserSession({ grantedPermissionCodes: ["USER_ACCOUNT.VIEW_USERS.VIEW"] });
    expect(decideRouteAccess({ pathname: ApplicationRoutes.usersList, session: withPermission, layoutAudience: "companyUser" }).kind).toBe("allow");
  });
});

describe("temporary password", () => {
  it("only the forced password change is reachable", () => {
    expect(
      decideRouteAccess({ pathname: ApplicationRoutes.usersList, session: companyUserWithTemporaryPassword, layoutAudience: "companyUser" }),
    ).toEqual({ kind: "redirect", destination: ApplicationRoutes.changePassword, reason: "mustChangePassword" });
    expect(
      decideRouteAccess({ pathname: ApplicationRoutes.changePassword, session: companyUserWithTemporaryPassword, layoutAudience: "companyUser" }).kind,
    ).toBe("allow");
  });

  it("once the password is changed, the forced page sends the person to their home page", () => {
    expect(decideRouteAccess({ pathname: ApplicationRoutes.changePassword, session: companyUser, layoutAudience: "companyUser" })).toEqual({
      kind: "redirect",
      destination: ApplicationRoutes.home,
      reason: "temporaryPasswordAlreadyChanged",
    });
  });

  it("a platform administrator has no business on /change-password", () => {
    expect(
      decideRouteAccess({ pathname: ApplicationRoutes.changePassword, session: platformAdministrator, layoutAudience: "companyUser" }).kind,
    ).toBe("redirect");
  });
});

describe("public sign-in pages", () => {
  it("are open to anybody who is not signed in", () => {
    for (const pathname of [ApplicationRoutes.companySignIn, ApplicationRoutes.platformSignIn]) {
      expect(decideRouteAccess({ pathname, session: null, layoutAudience: "public" }).kind).toBe("allow");
    }
  });

  it("send a signed-in person to their own home", () => {
    expect(decideRouteAccess({ pathname: ApplicationRoutes.companySignIn, session: companyUser, layoutAudience: "public" })).toEqual({
      kind: "redirect",
      destination: ApplicationRoutes.home,
      reason: "alreadySignedIn",
    });
    expect(decideRouteAccess({ pathname: ApplicationRoutes.platformSignIn, session: platformAdministrator, layoutAudience: "public" })).toEqual({
      kind: "redirect",
      destination: ApplicationRoutes.platformCompanies,
      reason: "alreadySignedIn",
    });
  });

  it("explain it to a company user who lands on the platform sign-in page", () => {
    expect(decideRouteAccess({ pathname: ApplicationRoutes.platformSignIn, session: companyUser, layoutAudience: "public" })).toEqual({
      kind: "redirect",
      destination: ApplicationRoutes.home,
      reason: "wrongAudience",
      noticeMessageKey: "accessNotice.notAuthorisedForPage",
    });
  });
});

describe("permissions", () => {
  const registry: ApplicationRouteDefinition[] = [
    ...applicationRouteRegistry,
    {
      routeKey: "testAnyOfTwo",
      pathPattern: "/test-any",
      audience: "companyUser",
      requiredPermissions: { mode: "any", permissionCodes: ["PRODUCTS.VIEW_PRODUCTS.VIEW", "PRODUCTS.NEW_PRODUCT.VIEW"] },
    },
    {
      routeKey: "testAllOfTwo",
      pathPattern: "/test-all",
      audience: "companyUser",
      requiredPermissions: { mode: "all", permissionCodes: ["PRODUCTS.VIEW_PRODUCTS.VIEW", "PRODUCTS.NEW_PRODUCT.VIEW"] },
    },
  ];
  const decide = (pathname: string, session: ReturnType<typeof buildCompanyUserSession>) =>
    decideRouteAccess({ pathname, session, layoutAudience: "companyUser", registry });

  it("a company user without the permission sees the Access denied screen, with the missing permission named", () => {
    expect(decide("/test-any", companyUser)).toEqual({
      kind: "denyAccess",
      reason: "missingPermission",
      missingPermissionCodes: ["PRODUCTS.VIEW_PRODUCTS.VIEW", "PRODUCTS.NEW_PRODUCT.VIEW"],
    });
  });

  it("'any' is satisfied by one of the permissions", () => {
    const session = buildCompanyUserSession({ grantedPermissionCodes: ["PRODUCTS.NEW_PRODUCT.VIEW"] });
    expect(decide("/test-any", session).kind).toBe("allow");
  });

  it("'all' needs every permission and names only the missing one", () => {
    const partly = buildCompanyUserSession({ grantedPermissionCodes: ["PRODUCTS.NEW_PRODUCT.VIEW"] });
    expect(decide("/test-all", partly)).toEqual({
      kind: "denyAccess",
      reason: "missingPermission",
      missingPermissionCodes: ["PRODUCTS.VIEW_PRODUCTS.VIEW"],
    });
    const fully = buildCompanyUserSession({
      grantedPermissionCodes: ["PRODUCTS.NEW_PRODUCT.VIEW", "PRODUCTS.VIEW_PRODUCTS.VIEW"],
    });
    expect(decide("/test-all", fully).kind).toBe("allow");
  });

  it("a temporary password is handled before permissions", () => {
    const session = buildCompanyUserSession({ mustChangePassword: true, grantedPermissionCodes: ["PRODUCTS.NEW_PRODUCT.VIEW"] });
    expect(decide("/test-any", session)).toMatchObject({ kind: "redirect", reason: "mustChangePassword" });
  });

  it("a platform administrator never reaches a company route, whatever the permissions", () => {
    expect(decide("/test-any", platformAdministrator)).toMatchObject({ kind: "redirect", reason: "wrongAudience" });
  });
});

describe("deny by default", () => {
  it("denies a path that is not in the route registry", () => {
    expect(decideRouteAccess({ pathname: "/not-registered", session: companyUser })).toEqual({
      kind: "denyAccess",
      reason: "routeNotRegistered",
      missingPermissionCodes: [],
    });
  });

  it("denies when the layout serves another audience than the route is registered for", () => {
    expect(
      decideRouteAccess({ pathname: ApplicationRoutes.platformCompanies, session: platformAdministrator, layoutAudience: "companyUser" }),
    ).toMatchObject({ kind: "denyAccess", reason: "layoutAudienceMismatch" });
  });
});
