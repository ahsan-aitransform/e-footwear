// Builds the text of public/sw.js from the template and the constants. Pure, so a test can compare it with the
// checked-in file. Node loads the two constants files directly (type stripping); they have no imports on purpose.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SERVICE_WORKER_CACHE_NAME } from "../lib/constants/browserStorageKeys.ts";
import {
  SERVICE_WORKER_OFFLINE_FALLBACK_ROUTE,
  ServiceWorkerPrecachedRoutes,
} from "../lib/constants/applicationRoutes.ts";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));

export function buildServiceWorkerSource() {
  const template = readFileSync(join(scriptsDirectory, "serviceWorker.template.js"), "utf8");
  return template
    .replace("__CACHE_NAME__", JSON.stringify(SERVICE_WORKER_CACHE_NAME))
    .replace("__SHELL_ROUTES__", JSON.stringify([...ServiceWorkerPrecachedRoutes]))
    .replace("__OFFLINE_FALLBACK_ROUTE__", JSON.stringify(SERVICE_WORKER_OFFLINE_FALLBACK_ROUTE));
}
