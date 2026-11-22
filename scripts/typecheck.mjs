// npm run typecheck: generates Next's route types (PageProps, LayoutProps) and runs the TypeScript compiler on the
// application with the same settings as the build (scripts/writeBuildTsconfig.mjs). Several agents can check at the same
// time with their own output folder:  NEXT_DIST_DIR=.next-agent1 npm run typecheck
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeBuildTsconfig } from "./writeBuildTsconfig.mjs";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";

function run(command, args) {
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: "inherit", shell: isWindows });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["next", "typegen"]);
const generatedConfigurationName = writeBuildTsconfig();
run("npx", ["tsc", "--noEmit", "-p", generatedConfigurationName]);
console.log("Typecheck passed.");
