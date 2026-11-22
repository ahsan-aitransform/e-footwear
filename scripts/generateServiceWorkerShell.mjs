// Writes public/sw.js from scripts/serviceWorker.template.js and the route constants.
//   npm run generate:shell            writes the file (runs before "npm run dev" and "npm run build")
//   npm run generate:shell -- --check exits with 1 when public/sw.js is out of date
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildServiceWorkerSource } from "./serviceWorkerSource.mjs";

const targetPath = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sw.js");
const source = buildServiceWorkerSource();

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(targetPath, "utf8");
  } catch {
    // missing file counts as stale
  }
  if (current !== source) {
    console.error("public/sw.js is stale. Run: npm run generate:shell");
    process.exit(1);
  }
  console.log("public/sw.js is up to date.");
} else {
  writeFileSync(targetPath, source, "utf8");
  console.log("Wrote public/sw.js");
}
