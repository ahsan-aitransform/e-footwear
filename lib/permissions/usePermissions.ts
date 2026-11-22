"use client";

import { useMemo } from "react";
import { useSessionState } from "@/lib/session/useSessionState";
import type { PermissionRequirement } from "@/lib/types/permissions";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  satisfiesPermissionRequirement,
} from "./permissionChecks";

const NO_PERMISSIONS: ReadonlySet<string> = new Set();

// The permissions of the signed-in person, as the server last reported them. Use it to show or hide parts of a screen;
// the server checks every permission again on every request, so this is convenience, not security.
export function usePermissions() {
  const sessionState = useSessionState();

  const grantedPermissionCodes = useMemo<ReadonlySet<string>>(
    () =>
      sessionState.phase === "authenticated"
        ? new Set(sessionState.storedSession.currentSession.grantedPermissionCodes)
        : NO_PERMISSIONS,
    [sessionState],
  );

  return useMemo(
    () => ({
      grantedPermissionCodes,
      hasPermission: (permissionCode: string) => hasPermission(grantedPermissionCodes, permissionCode),
      hasAnyPermission: (permissionCodes: readonly string[]) => hasAnyPermission(grantedPermissionCodes, permissionCodes),
      hasAllPermissions: (permissionCodes: readonly string[]) => hasAllPermissions(grantedPermissionCodes, permissionCodes),
      satisfiesRequirement: (requirement: PermissionRequirement | undefined) =>
        satisfiesPermissionRequirement(grantedPermissionCodes, requirement),
    }),
    [grantedPermissionCodes],
  );
}
