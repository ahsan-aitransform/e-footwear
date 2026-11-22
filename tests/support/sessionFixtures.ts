import { IndexedDatabaseKeys } from "@/lib/constants/browserStorageKeys";
import { RoleCodes } from "@/lib/constants/roleCodes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { resetSelectedStoreStoreForTests } from "@/lib/session/selectedStoreStore";
import {
  initializeSession,
  resetSessionStoreForTests,
  verifySessionWithServer,
} from "@/lib/session/sessionStore";
import { resetIndexedKeyValueStoreForTests, writeStoredValue } from "@/lib/storage/indexedKeyValueStore";
import type { CurrentSessionResponse, StoredSession } from "@/lib/types/session";

export const TEST_COMPANY_ID = "0197c3a0-1111-7000-8000-000000000001";
export const TEST_USER_ID = "0197c3a0-2222-7000-8000-000000000002";
export const TEST_STORE_ID = "0197c3a0-3333-7000-8000-000000000003";

// A company user with the given permissions (an empty list by default).
export function buildCompanyUserSession(overrides: Partial<CurrentSessionResponse> = {}): CurrentSessionResponse {
  return {
    audience: "COMPANY_USER",
    displayName: "Test Cashier",
    emailOrUsername: "cashier@example.test",
    platformAdministratorId: null,
    companyId: TEST_COMPANY_ID,
    companyName: "Test Company",
    userId: TEST_USER_ID,
    roleCode: RoleCodes.cashierSalesman,
    hasAccessToAllStores: false,
    accessibleStoreIds: [TEST_STORE_ID],
    mustChangePassword: false,
    grantedPermissionCodes: [],
    ...overrides,
  };
}

export function buildPlatformAdministratorSession(overrides: Partial<CurrentSessionResponse> = {}): CurrentSessionResponse {
  return {
    audience: "PLATFORM_ADMINISTRATOR",
    displayName: "Super Admin",
    emailOrUsername: "superadmin",
    platformAdministratorId: "0197c3a0-4444-7000-8000-000000000004",
    companyId: null,
    companyName: null,
    userId: null,
    roleCode: RoleCodes.platformAdministrator,
    hasAccessToAllStores: true,
    accessibleStoreIds: [],
    mustChangePassword: false,
    grantedPermissionCodes: [],
    ...overrides,
  };
}

export const sampleViewProductsPermission = PermissionCodes.PRODUCTS.VIEW_PRODUCTS.VIEW;

export function buildStoredSession(currentSession: CurrentSessionResponse, accessToken = "test-access-token"): StoredSession {
  return { accessToken, signedInAtIsoTimestamp: "2026-11-20T10:00:00.000Z", currentSession };
}

// Starts every test with an empty browser: no stored session, no selected store, a fresh IndexedDB.
export async function resetBrowserStateForTests(): Promise<void> {
  resetSessionStoreForTests();
  resetSelectedStoreStoreForTests();
  await resetIndexedKeyValueStoreForTests();
  indexedDB.deleteDatabase("efootwear");
}

// Puts a signed-in person on the device (as if they had signed in earlier) and loads it into the session store.
// The server confirmation is a separate step: call verifySessionWithServer() with a fetch mock that answers /auth/me.
export async function seedStoredSession(currentSession: CurrentSessionResponse): Promise<void> {
  await writeStoredValue(IndexedDatabaseKeys.storedSession, buildStoredSession(currentSession));
  await initializeSession();
}

export async function seedVerifiedSession(currentSession: CurrentSessionResponse, installMeResponse: () => void): Promise<void> {
  await seedStoredSession(currentSession);
  installMeResponse();
  await verifySessionWithServer();
}
