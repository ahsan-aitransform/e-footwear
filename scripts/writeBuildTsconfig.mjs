// Writes tsconfig.build.generated.json: the TypeScript settings used by "next build" (through next.config.ts) and by
// "npm run typecheck". It is tsconfig.json with ONE difference: it reads the route types of the output folder in use
// (NEXT_DIST_DIR, default .next) and never ".next/dev", which belongs to a running dev server and may be stale.
// Without this, a dev server left running while routes change makes every build fail on its outdated generated files.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const GENERATED_TSCONFIG_NAME = "tsconfig.build.generated.json";

export function writeBuildTsconfig() {
  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const distDirectory = process.env.NEXT_DIST_DIR ?? ".next";
  writeFileSync(
    join(projectRoot, GENERATED_TSCONFIG_NAME),
    JSON.stringify(
      {
        extends: "./tsconfig.json",
        compilerOptions: { incremental: false },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", "**/*.mts", `${distDirectory}/types/**/*.ts`],
        exclude: ["node_modules", ".next", ".next-*"],
      },
      null,
      2,
    ),
  );
  return GENERATED_TSCONFIG_NAME;
}

// Run directly (npm predev/prebuild): write the file. Imported by typecheck.mjs: only export the function.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`Wrote ${writeBuildTsconfig()}`);
}
