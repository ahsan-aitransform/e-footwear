import { existsSync } from "node:fs";
import type { NextConfig } from "next";

// URL of the .NET API. Server-side only: the browser never sees it, it calls the same-origin proxy below.
// One name everywhere: API_BASE_URL (see .env.local.example).
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:5069";

// Type checking during "next build" uses tsconfig.build.generated.json (written by scripts/writeBuildTsconfig.mjs before
// every dev and build run), which ignores the generated types of a running dev server. See FRONTEND-ARCHITECTURE.md.
const GENERATED_TSCONFIG = "tsconfig.build.generated.json";

const nextConfig: NextConfig = {
  typescript: existsSync(GENERATED_TSCONFIG) ? { tsconfigPath: GENERATED_TSCONFIG } : undefined,
  // Several agents or CI jobs can build at the same time by giving each its own output folder:
  //   NEXT_DIST_DIR=.next-agent1 npm run build
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  experimental: {
    agentFeedback: true,
    // Development-only check that every page can open instantly. Every screen here shows nothing until the sign-in check
    // (GET /auth/me) has answered, so none of them can, and the check would warn on each page. "manual-warning" validates
    // only segments that opt in with `export const instant = true`. A layout's `instant = false` does not cover its pages.
    instantInsights: { validationLevel: "manual-warning" },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser calls the API through this same-origin proxy, so no CORS setup is needed on the API.
  // Offline screens use it for every request, and the service worker never caches it.
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${API_BASE_URL}/api/v1/:path*` },
      { source: "/health", destination: `${API_BASE_URL}/health` },
    ];
  },
};

export default nextConfig;
