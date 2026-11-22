// Generates lib/contracts/permissionCodes.ts from lib/contracts/permissionCatalog.snapshot.json.
//
//   npm run contracts:generate                                  uses the checked-in snapshot (works offline)
//   npm run contracts:generate -- --from-api <baseUrl> --token <accessToken>
//        fetches GET <baseUrl>/api/v1/permissions/catalog, validates it, overwrites the snapshot, then generates
//   npm run contracts:generate -- --check                       exits with 1 when the generated file is stale
//
// The accessToken is a sign-in token of any company user (or the EFW_API_ACCESS_TOKEN environment variable).
// Sync step: whenever the backend permission catalog changes, run the --from-api form, commit the new snapshot and
// the regenerated lib/contracts/permissionCodes.ts, then fix the TypeScript errors in the route registry.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generatePermissionCodesSource, validatePermissionCatalog } from "./permissionCodesGenerator.mjs";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = join(projectRoot, "lib", "contracts", "permissionCatalog.snapshot.json");
const generatedPath = join(projectRoot, "lib", "contracts", "permissionCodes.ts");

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function fetchCatalogFromApi(baseUrl, accessToken) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/permissions/catalog`;
  const headers = { Accept: "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GET ${url} answered ${response.status}`);
  return response.json();
}

async function main() {
  const fromApi = readArgument("--from-api");
  if (fromApi) {
    const accessToken = readArgument("--token") ?? process.env.EFW_API_ACCESS_TOKEN;
    const catalog = await fetchCatalogFromApi(fromApi, accessToken);
    validatePermissionCatalog(catalog);
    writeFileSync(snapshotPath, JSON.stringify(catalog, null, 2) + "\n", "utf8");
    console.log(`Snapshot updated from ${fromApi}.`);
  }

  const catalog = JSON.parse(readFileSync(snapshotPath, "utf8"));
  const source = generatePermissionCodesSource(catalog);

  if (process.argv.includes("--check")) {
    const current = readFileSync(generatedPath, "utf8");
    if (current !== source) {
      console.error("lib/contracts/permissionCodes.ts is stale. Run: npm run contracts:generate");
      process.exit(1);
    }
    console.log("permissionCodes.ts is up to date.");
    return;
  }

  writeFileSync(generatedPath, source, "utf8");
  const permissionCount = catalog.modules.reduce((n, m) => n + m.screens.reduce((k, s) => k + s.actions.length, 0), 0);
  console.log(`Wrote lib/contracts/permissionCodes.ts (${catalog.modules.length} modules, ${permissionCount} permissions).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
