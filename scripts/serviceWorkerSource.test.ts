import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ServiceWorkerPrecachedRoutes } from "@/lib/constants/applicationRoutes";
import { buildServiceWorkerSource } from "./serviceWorkerSource.mjs";

describe("service worker", () => {
  it("public/sw.js is generated from the route constants and not stale (run: npm run generate:shell)", () => {
    const checkedIn = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
    expect(checkedIn).toBe(buildServiceWorkerSource());
  });

  it("precaches exactly the routes of ServiceWorkerPrecachedRoutes (no second list)", () => {
    const source = buildServiceWorkerSource();
    for (const route of ServiceWorkerPrecachedRoutes) expect(source).toContain(`"${route}"`);
    expect(source).not.toContain("__SHELL_ROUTES__");
    expect(source).not.toContain("__CACHE_NAME__");
    expect(source).not.toContain("__OFFLINE_FALLBACK_ROUTE__");
  });

  it("never caches API calls", () => {
    expect(buildServiceWorkerSource()).toContain('url.pathname.startsWith("/api/")');
  });
});
