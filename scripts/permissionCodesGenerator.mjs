// Pure functions that validate a permission catalog and turn it into lib/contracts/permissionCodes.ts.
// Used by scripts/generatePermissionCodes.mjs (the command) and by lib/contracts/permissionCodes.test.ts (the staleness check).

const UPPER_SNAKE_SEGMENT = /^[A-Z][A-Z0-9_]*$/;

export function validatePermissionCatalog(catalog) {
  if (!catalog || !Array.isArray(catalog.modules) || catalog.modules.length === 0) {
    throw new Error("The permission catalog must contain a non-empty 'modules' array.");
  }
  const seenPermissionCodes = new Set();
  for (const moduleDefinition of catalog.modules) {
    if (!UPPER_SNAKE_SEGMENT.test(moduleDefinition.moduleCode ?? "")) {
      throw new Error(`Invalid moduleCode: ${JSON.stringify(moduleDefinition.moduleCode)}`);
    }
    for (const screen of moduleDefinition.screens ?? []) {
      if (!UPPER_SNAKE_SEGMENT.test(screen.screenCode ?? "")) {
        throw new Error(`Invalid screenCode in ${moduleDefinition.moduleCode}: ${JSON.stringify(screen.screenCode)}`);
      }
      for (const action of screen.actions ?? []) {
        if (!UPPER_SNAKE_SEGMENT.test(action.actionCode ?? "")) {
          throw new Error(`Invalid actionCode in ${moduleDefinition.moduleCode}.${screen.screenCode}: ${JSON.stringify(action.actionCode)}`);
        }
        // Screen permissions are <MODULE>.<SCREEN>.<ACTION>. The backend also lists the legacy "restricted operation" codes the
        // database functions check (SALE_CREATE, PRICE_CHANGE, ...): one flat UPPER_SNAKE segment, equal to their action code.
        const expected = `${moduleDefinition.moduleCode}.${screen.screenCode}.${action.actionCode}`;
        const isScreenPermission = action.permissionCode === expected;
        const isRestrictedOperation =
          action.permissionCode === action.actionCode && UPPER_SNAKE_SEGMENT.test(action.permissionCode ?? "");
        if (!isScreenPermission && !isRestrictedOperation) {
          throw new Error(`permissionCode ${JSON.stringify(action.permissionCode)} must be ${expected} or a restricted-operation code equal to its actionCode`);
        }
        if (seenPermissionCodes.has(action.permissionCode)) throw new Error(`Duplicate permission code ${action.permissionCode}`);
        seenPermissionCodes.add(action.permissionCode);
      }
    }
  }
}

export function generatePermissionCodesSource(catalog) {
  validatePermissionCatalog(catalog);

  const lines = [];
  lines.push("// GENERATED FILE - DO NOT EDIT BY HAND.");
  lines.push("// Source: lib/contracts/permissionCatalog.snapshot.json (the registered modules, screens and actions).");
  lines.push("// Regenerate with: npm run contracts:generate");
  lines.push("// Refresh the snapshot from a running API first with:");
  lines.push("//   npm run contracts:generate -- --from-api http://localhost:5069 --token <access token>");
  lines.push("");
  lines.push("export const PermissionModuleCodes = {");
  for (const moduleDefinition of catalog.modules) lines.push(`  ${moduleDefinition.moduleCode}: "${moduleDefinition.moduleCode}",`);
  lines.push("} as const;");
  lines.push("");
  lines.push("export type PermissionModuleCode = (typeof PermissionModuleCodes)[keyof typeof PermissionModuleCodes];");
  lines.push("");
  lines.push("// Usage: PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW === \"PRODUCTS.NEW_PRODUCT.VIEW\"");
  lines.push("export const PermissionCodes = {");
  for (const moduleDefinition of catalog.modules) {
    lines.push(`  ${moduleDefinition.moduleCode}: {`);
    for (const screen of moduleDefinition.screens) {
      lines.push(`    ${screen.screenCode}: {`);
      for (const action of screen.actions) {
        lines.push(`      ${action.actionCode}: "${action.permissionCode}",`);
      }
      lines.push("    },");
    }
    lines.push("  },");
  }
  lines.push("} as const;");
  lines.push("");
  lines.push("type PermissionCodesTree = typeof PermissionCodes;");
  lines.push("");
  lines.push("export type PermissionCode = {");
  lines.push("  [Module in keyof PermissionCodesTree]: {");
  lines.push("    [Screen in keyof PermissionCodesTree[Module]]: PermissionCodesTree[Module][Screen][keyof PermissionCodesTree[Module][Screen]];");
  lines.push("  }[keyof PermissionCodesTree[Module]];");
  lines.push("}[keyof PermissionCodesTree];");
  lines.push("");
  lines.push("export const allPermissionCodes: readonly PermissionCode[] = [");
  for (const moduleDefinition of catalog.modules) {
    for (const screen of moduleDefinition.screens) {
      for (const action of screen.actions) lines.push(`  PermissionCodes.${moduleDefinition.moduleCode}.${screen.screenCode}.${action.actionCode},`);
    }
  }
  lines.push("];");
  lines.push("");
  lines.push("const knownPermissionCodes: ReadonlySet<string> = new Set(allPermissionCodes);");
  lines.push("");
  lines.push("export function isKnownPermissionCode(value: string): value is PermissionCode {");
  lines.push("  return knownPermissionCodes.has(value);");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}
