import type { RoleCode } from "@/lib/constants/roleCodes";
import type { PermissionCode } from "@/lib/contracts/permissionCodes";

export type SessionAudience = "PLATFORM_ADMINISTRATOR" | "COMPANY_USER";

// GET /api/v1/auth/me. The server is the authority; the browser only mirrors it to decide what to show.
export type CurrentSessionResponse = {
  audience: SessionAudience;
  displayName: string;
  emailOrUsername: string;
  platformAdministratorId: string | null;
  companyId: string | null;
  companyName: string | null;
  userId: string | null;
  roleCode: RoleCode | string;
  hasAccessToAllStores: boolean;
  accessibleStoreIds: string[];
  mustChangePassword: boolean;
  grantedPermissionCodes: Array<PermissionCode | string>;
};

// What is kept in IndexedDB so the device keeps working offline.
export type StoredSession = {
  accessToken: string;
  signedInAtIsoTimestamp: string;
  currentSession: CurrentSessionResponse;
};

// How far the session has been checked against the server in this page load.
export type SessionVerificationStatus = "pending" | "verified" | "offlineUnverified";

export type SessionStoreState =
  | { phase: "initializing" }
  | { phase: "anonymous" }
  | {
      phase: "authenticated";
      storedSession: StoredSession;
      verification: SessionVerificationStatus;
      isOnline: boolean;
    };
