import type { CurrentSessionResponse, SessionAudience, StoredSession } from "@/lib/types/session";

const SESSION_AUDIENCES: readonly SessionAudience[] = ["PLATFORM_ADMINISTRATOR", "COMPANY_USER"];

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Checks the shape of GET /auth/me. Anything that does not match the contract is rejected (returns null), so a
// stale or tampered value can never be treated as a valid session.
export function parseCurrentSessionResponse(raw: unknown): CurrentSessionResponse | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (!SESSION_AUDIENCES.includes(value.audience as SessionAudience)) return null;
  if (typeof value.displayName !== "string") return null;
  if (typeof value.emailOrUsername !== "string") return null;
  if (!isStringOrNull(value.platformAdministratorId)) return null;
  if (!isStringOrNull(value.companyId)) return null;
  if (!isStringOrNull(value.companyName)) return null;
  if (!isStringOrNull(value.userId)) return null;
  if (typeof value.roleCode !== "string") return null;
  if (typeof value.hasAccessToAllStores !== "boolean") return null;
  if (!isStringArray(value.accessibleStoreIds)) return null;
  if (typeof value.mustChangePassword !== "boolean") return null;
  if (!isStringArray(value.grantedPermissionCodes)) return null;

  return {
    audience: value.audience as SessionAudience,
    displayName: value.displayName,
    emailOrUsername: value.emailOrUsername,
    platformAdministratorId: value.platformAdministratorId,
    companyId: value.companyId,
    companyName: value.companyName,
    userId: value.userId,
    roleCode: value.roleCode,
    hasAccessToAllStores: value.hasAccessToAllStores,
    accessibleStoreIds: value.accessibleStoreIds,
    mustChangePassword: value.mustChangePassword,
    grantedPermissionCodes: value.grantedPermissionCodes,
  };
}

// Checks a value read back from IndexedDB. A session saved by an older build (different shape) is rejected,
// which sends the person to the sign-in page once.
export function parseStoredSession(raw: unknown): StoredSession | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.accessToken !== "string" || value.accessToken.length === 0) return null;
  if (typeof value.signedInAtIsoTimestamp !== "string") return null;
  const currentSession = parseCurrentSessionResponse(value.currentSession);
  if (!currentSession) return null;
  return {
    accessToken: value.accessToken,
    signedInAtIsoTimestamp: value.signedInAtIsoTimestamp,
    currentSession,
  };
}
