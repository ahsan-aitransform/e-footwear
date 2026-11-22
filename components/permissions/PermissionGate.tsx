"use client";

import type { ReactNode } from "react";
import { usePermissions } from "@/lib/permissions/usePermissions";
import type { PermissionRequirement } from "@/lib/types/permissions";

// Shows its children only when the signed-in person has the permissions (a button, a card, a column).
// Hiding is convenience: the server refuses the action anyway without the permission.
//
//   <PermissionGate requirement={requireAnyPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.ADD)}>
//     <Button>New product</Button>
//   </PermissionGate>
export function PermissionGate({
  requirement,
  fallback = null,
  children,
}: {
  requirement: PermissionRequirement;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { satisfiesRequirement } = usePermissions();
  return <>{satisfiesRequirement(requirement) ? children : fallback}</>;
}
