// Shapes of the user management endpoints (docx 1.1 to 1.3, Part 6). They mirror the C# records in EFootwear.BLL/Security/Contracts.

export type UserDetailsResponse = {
  id: string;
  email: string;
  fullName: string;
  roleCode: string;
  hasAccessToAllStores: boolean;
  status: string;
  mustChangePassword: boolean;
  lockedUntil: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  storeIds: string[];
  storeCodes: string[];
  // Goes back in the update so a stale edit is refused with 409 CONCURRENT_UPDATE.
  rowVersion: number;
};

export type UpdateUserRequest = {
  email: string;
  fullName: string;
  roleCode: string;
  storeIds: string[];
  rowVersion: number;
};

export type ResetUserPasswordRequest = { temporaryPassword: string };

// Shown once: the administrator hands the token to the user.
export type IssuedPasswordResetTokenResponse = { resetToken: string; expiresAt: string };

export type RequestPasswordResetRequest = { email: string };
export type CompletePasswordResetRequest = { resetToken: string; newPassword: string };

export type UserPermissionsResponse = {
  userId: string;
  roleCode: string;
  holdsEveryPermissionByRole: boolean;
  grantedPermissionCodes: string[];
};

export type ReplaceUserPermissionsRequest = { permissionCodes: string[] };

export type UserQuickActionsResponse = { actionCodes: string[] };
export type ReplaceUserQuickActionsRequest = { actionCodes: string[] };
