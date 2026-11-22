import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { ApplicationRoutePatterns, ServiceWorkerPrecachedRoutes } from "@/lib/constants/applicationRoutes";
import { isKnownPermissionCode } from "@/lib/contracts/permissionCodes";
import { navigationGroupDefinitions } from "./navigationGroups";
import { resolveRouteDefinition } from "./resolveRouteDefinition";
import { applicationRouteRegistry, type RouteAudience } from "./routeRegistry";

const applicationDirectory = join(process.cwd(), "app");

function listPageFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) return listPageFiles(fullPath);
    return entry === "page.tsx" ? [fullPath] : [];
  });
}

// app/(platform)/platform/companies/[companyId]/page.tsx -> { urlPattern: "/platform/companies/[companyId]", routeGroup: "(platform)" }
function describePageFile(pageFile: string): { urlPattern: string; routeGroup: string | null } {
  const segments = relative(applicationDirectory, pageFile).split(sep).slice(0, -1);
  const routeGroup = segments.find((segment) => /^\(.+\)$/.test(segment)) ?? null;
  const urlSegments = segments.filter((segment) => !/^\(.+\)$/.test(segment));
  return { urlPattern: `/${urlSegments.join("/")}`, routeGroup };
}

const audienceByRouteGroup: Record<string, RouteAudience> = {
  "(public)": "public",
  "(platform)": "platformAdministrator",
  "(company)": "companyUser",
  "(company-account)": "companyUser",
};

describe("route registry", () => {
  it("has unique route keys and unique path patterns", () => {
    const keys = applicationRouteRegistry.map((route) => route.routeKey);
    const patterns = applicationRouteRegistry.map((route) => route.pathPattern);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it("registers every route pattern of ApplicationRoutePatterns, and nothing else", () => {
    const registered = applicationRouteRegistry.map((route) => route.pathPattern).sort();
    expect(registered).toEqual(Object.values(ApplicationRoutePatterns).sort());
  });

  it("deny by default: every page under app/ is registered, with the audience of its route group", () => {
    const pageFiles = listPageFiles(applicationDirectory);
    expect(pageFiles.length).toBeGreaterThan(0);

    for (const pageFile of pageFiles) {
      const { urlPattern, routeGroup } = describePageFile(pageFile);
      const route = applicationRouteRegistry.find((candidate) => candidate.pathPattern === urlPattern);
      expect(route, `${urlPattern} (${relative(process.cwd(), pageFile)}) is missing from lib/routing/routeRegistry.ts`).toBeDefined();

      // The root page "/" is outside every route group and public by nature.
      const expectedAudience = routeGroup ? audienceByRouteGroup[routeGroup] : "public";
      expect(expectedAudience, `route group ${routeGroup} has no audience in this test`).toBeDefined();
      expect(route?.audience, `${urlPattern} is in ${routeGroup ?? "no route group"} but registered for another audience`).toBe(expectedAudience);
    }
  });

  it("registers no route without a page (a registry entry for a page that does not exist is a leftover)", () => {
    const patternsOnDisk = new Set(listPageFiles(applicationDirectory).map((pageFile) => describePageFile(pageFile).urlPattern));
    for (const route of applicationRouteRegistry) {
      expect(patternsOnDisk.has(route.pathPattern), `${route.pathPattern} has no page.tsx`).toBe(true);
    }
  });

  it("only uses permission codes the catalog knows", () => {
    for (const route of applicationRouteRegistry) {
      for (const code of route.requiredPermissions?.permissionCodes ?? []) {
        expect(isKnownPermissionCode(code), `${route.routeKey} requires unknown permission ${code}`).toBe(true);
      }
    }
  });

  it("puts every menu entry in a known navigation group", () => {
    for (const route of applicationRouteRegistry.filter((candidate) => candidate.navigation)) {
      expect(navigationGroupDefinitions[route.navigation!.groupCode]).toBeDefined();
    }
  });

  it("keeps every platform (super admin) page behind the platformAdministrator audience", () => {
    for (const route of applicationRouteRegistry) {
      const isPlatformPage = route.pathPattern.startsWith("/platform") && route.pathPattern !== ApplicationRoutePatterns.platformSignIn;
      if (isPlatformPage) expect(route.audience, route.pathPattern).toBe("platformAdministrator");
    }
  });

  it("precaches only registered, fixed paths", () => {
    for (const path of ServiceWorkerPrecachedRoutes) {
      const route = resolveRouteDefinition(path);
      expect(route, `${path} is precached but not registered`).toBeDefined();
      expect(route?.pathPattern.includes("[")).toBe(false);
    }
  });
});

describe("resolveRouteDefinition", () => {
  it("matches dynamic segments and prefers the more specific static route", () => {
    expect(resolveRouteDefinition("/platform/companies/0197c3a0-5555-7000-8000-000000000005")?.routeKey).toBe("platformCompanyDetail");
    expect(resolveRouteDefinition("/platform/directory")?.routeKey).toBe("platformDirectory");
    expect(resolveRouteDefinition("/platform/")?.routeKey).toBe("platformCompanies");
  });

  it("ignores query string and hash, and returns undefined for unknown paths", () => {
    expect(resolveRouteDefinition("/login?changed=1")?.routeKey).toBe("companySignIn");
    expect(resolveRouteDefinition("/platform/unknown")).toBeUndefined();
    expect(resolveRouteDefinition("/platform/companies/a/b")).toBeUndefined();
  });
});
