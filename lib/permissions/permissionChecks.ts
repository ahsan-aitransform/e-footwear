import type { PermissionRequirement } from "@/lib/types/permissions";

// Pure permission logic, shared by route guards, menus, permission gates and tests. The browser only mirrors what the
// server decided (grantedPermissionCodes of GET /auth/me); the server enforces every permission again on every call.

export function hasPermission(grantedPermissionCodes: ReadonlySet<string>, permissionCode: string): boolean {
  return grantedPermissionCodes.has(permissionCode);
}

export function hasAnyPermission(grantedPermissionCodes: ReadonlySet<string>, permissionCodes: readonly string[]): boolean {
  return permissionCodes.some((permissionCode) => grantedPermissionCodes.has(permissionCode));
}

export function hasAllPermissions(grantedPermissionCodes: ReadonlySet<string>, permissionCodes: readonly string[]): boolean {
  return permissionCodes.every((permissionCode) => grantedPermissionCodes.has(permissionCode));
}

// An empty requirement means "no permission needed".
export function satisfiesPermissionRequirement(
  grantedPermissionCodes: ReadonlySet<string>,
  requirement: PermissionRequirement | undefined,
): boolean {
  if (!requirement || requirement.permissionCodes.length === 0) return true;
  return requirement.mode === "all"
    ? hasAllPermissions(grantedPermissionCodes, requirement.permissionCodes)
    : hasAnyPermission(grantedPermissionCodes, requirement.permissionCodes);
}

export function findMissingPermissionCodes(
  grantedPermissionCodes: ReadonlySet<string>,
  requirement: PermissionRequirement | undefined,
): string[] {
  if (!requirement) return [];
  return requirement.permissionCodes.filter((permissionCode) => !grantedPermissionCodes.has(permissionCode));
}

export function requireAnyPermission<TPermissionCode extends string>(
  ...permissionCodes: TPermissionCode[]
): PermissionRequirement<TPermissionCode> {
  return { mode: "any", permissionCodes };
}

export function requireAllPermissions<TPermissionCode extends string>(
  ...permissionCodes: TPermissionCode[]
): PermissionRequirement<TPermissionCode> {
  return { mode: "all", permissionCodes };
}
