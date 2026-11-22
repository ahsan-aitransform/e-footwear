"use client";

import type { ReactNode } from "react";
import { AccessDeniedScreen } from "@/components/feedback/AccessDeniedScreen";
import { findMissingPermissionCodes } from "@/lib/permissions/permissionChecks";
import { usePermissions } from "@/lib/permissions/usePermissions";
import type { PermissionRequirement } from "@/lib/types/permissions";

// Page-level check for a screen that needs more than its route registry entry says (for example one tab of a screen).
// Shows the Access denied screen when the permissions are missing. For a block inside a page use PermissionGate.
export function PermissionGuard({
  requirement,
  children,
}: {
  requirement: PermissionRequirement;
  children: ReactNode;
}) {
  const { grantedPermissionCodes, satisfiesRequirement } = usePermissions();
  if (!satisfiesRequirement(requirement)) {
    return (
      <AccessDeniedScreen
        reason="missingPermission"
        missingPermissionCodes={findMissingPermissionCodes(grantedPermissionCodes, requirement)}
      />
    );
  }
  return <>{children}</>;
}
