// Opens every fixed page of the application once, so "next dev" compiles them ahead of time instead of while you click a menu
// entry. Start it in a second terminal after "npm run dev" (npm run dev:warm). Turbopack keeps what it compiled on disk, so after
// the first run a restarted dev server opens the same pages quickly. Pages with a dynamic segment ([id]) are skipped.
//   node scripts/warmUpDevelopmentRoutes.mjs [baseUrl]
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const appDirectory = "app";

function findPageFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return findPageFiles(path);
    return /^page\.(tsx|ts|jsx|js)$/.test(entry) ? [path] : [];
  });
}

// "app/(company)/users/new/page.tsx" -> "/users/new"; route groups "(x)" are not part of the address.
const routes = findPageFiles(appDirectory)
  .map((file) => relative(appDirectory, file).split(sep).slice(0, -1))
  .filter((segments) => !segments.some((segment) => segment.includes("[")))
  .map((segments) => `/${segments.filter((segment) => !(segment.startsWith("(") && segment.endsWith(")"))).join("/")}`)
  .sort();

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await fetch(baseUrl, { redirect: "manual" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`The development server did not answer at ${baseUrl}. Start it with: npm run dev`);
}

await waitForServer();
console.log(`Compiling ${routes.length} pages ...`);
let done = 0;
for (const route of routes) {
  const started = Date.now();
  try {
    await fetch(`${baseUrl}${route}`, { redirect: "manual" });
  } catch (error) {
    console.warn(`  ${route}: ${error instanceof Error ? error.message : error}`);
  }
  done += 1;
  console.log(`  [${done}/${routes.length}] ${route} (${Date.now() - started} ms)`);
}
console.log("Done. Every page is compiled; menu clicks no longer wait for the compiler.");
