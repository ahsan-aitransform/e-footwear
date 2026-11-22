import type { StoreSummaryResponse } from "./store";

// One row of the Users Account grid (docx 1.3). There is deliberately no password column.
export type UserListItemResponse = {
  id: string;
  email: string;
  fullName: string;
  roleCode: string;
  allStores: boolean;
  status: string;
  mustChangePassword: boolean;
  storeIds: string[];
  storeCodes: string[];
  lastSignInAt: string | null;
  isSignedInNow: boolean;
  lockedUntil: string | null;
};

export type UserCreationOptionsResponse = {
  roles: string[];
  stores: StoreSummaryResponse[];
  needsStore: boolean;
};

export type CreateUserRequest = {
  companyId: string | null;
  email: string;
  fullName: string;
  roleCode: string;
  storeIds: string[];
  password: string;
  // The permission set chosen on the screen. Left out: the suggested set of the role.
  permissionCodes?: string[];
  // The quick-action toolbar buttons (docx Standard Menu).
  quickActionCodes?: string[];
};

export type CreateUserResponse = { id: string };
