import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit and component tests. jsdom provides the browser; fake-indexeddb (tests/setup) provides IndexedDB.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitestSetup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", ".next-*/**"],
    restoreMocks: true,
    // Each jsdom worker costs hundreds of MB; on a developer laptop with several agents running, many workers starve the machine.
    maxWorkers: 3,
  },
});
