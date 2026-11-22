import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDatabaseKeys } from "@/lib/constants/browserStorageKeys";
import { installFetchMock } from "@/tests/support/fetchMock";
import {
  TEST_STORE_ID,
  buildCompanyUserSession,
  buildPlatformAdministratorSession,
  resetBrowserStateForTests,
  seedStoredSession,
} from "@/tests/support/sessionFixtures";
import { readStoredValue, writeStoredValue } from "@/lib/storage/indexedKeyValueStore";
import { getSelectedStoreIdSnapshot, setSelectedStoreId } from "./selectedStoreStore";
import {
  endSession,
  getSessionSnapshot,
  initializeSession,
  reportBrowserConnectivity,
  startSession,
  verifySessionWithServer,
} from "./sessionStore";

beforeEach(async () => {
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("initializeSession", () => {
  it("is anonymous when nothing is stored", async () => {
    await initializeSession();
    expect(getSessionSnapshot()).toEqual({ phase: "anonymous" });
  });

  it("loads a stored session as authenticated but not yet verified", async () => {
    await seedStoredSession(buildCompanyUserSession());
    const state = getSessionSnapshot();
    expect(state).toMatchObject({ phase: "authenticated", verification: "pending" });
  });

  it("rejects a session saved by an older build (different shape) instead of trusting it", async () => {
    await writeStoredValue(IndexedDatabaseKeys.storedSession, {
      token: "old",
      me: { platformAdmin: true, adminId: "x", username: "root" },
      signedInAt: "2026-01-01T00:00:00Z",
    });
    await initializeSession();
    expect(getSessionSnapshot().phase).toBe("anonymous");
  });

  it("rejects a stored session whose audience was tampered with into something unknown", async () => {
    await writeStoredValue(IndexedDatabaseKeys.storedSession, {
      accessToken: "t",
      signedInAtIsoTimestamp: "2026-01-01T00:00:00Z",
      currentSession: { ...buildCompanyUserSession(), audience: "SUPER_USER" },
    });
    await initializeSession();
    expect(getSessionSnapshot().phase).toBe("anonymous");
  });
});

describe("verifySessionWithServer", () => {
  it("replaces the stored permissions with what the server says now, and keeps them on the device", async () => {
    await seedStoredSession(buildCompanyUserSession({ grantedPermissionCodes: ["PRODUCTS.NEW_PRODUCT.VIEW"] }));
    const fromServer = buildCompanyUserSession({ grantedPermissionCodes: [] });
    installFetchMock(() => ({ body: fromServer }));

    await verifySessionWithServer();

    const state = getSessionSnapshot();
    expect(state).toMatchObject({ phase: "authenticated", verification: "verified", isOnline: true });
    if (state.phase === "authenticated") expect(state.storedSession.currentSession.grantedPermissionCodes).toEqual([]);
    const persisted = await readStoredValue<{ currentSession: { grantedPermissionCodes: string[] } }>(IndexedDatabaseKeys.storedSession);
    expect(persisted?.currentSession.grantedPermissionCodes).toEqual([]);
  });

  it("TAMPERING: a stored 'platform administrator' that the server says is a company user becomes a company user", async () => {
    await seedStoredSession(buildPlatformAdministratorSession());
    installFetchMock(() => ({ body: buildCompanyUserSession() }));
    await verifySessionWithServer();
    const state = getSessionSnapshot();
    expect(state.phase === "authenticated" && state.storedSession.currentSession.audience).toBe("COMPANY_USER");
  });

  it("ends the session when the server refuses the token (401) and clears the device", async () => {
    await seedStoredSession(buildCompanyUserSession());
    installFetchMock(() => ({ status: 401, body: { title: "Unauthorized" } }));
    await verifySessionWithServer();
    expect(getSessionSnapshot().phase).toBe("anonymous");
    expect(await readStoredValue(IndexedDatabaseKeys.storedSession)).toBeUndefined();
  });

  it("ends the session when the server says the account is forbidden (403, for example blocked)", async () => {
    await seedStoredSession(buildCompanyUserSession());
    installFetchMock(() => ({ status: 403, body: { title: "Forbidden" } }));
    await verifySessionWithServer();
    expect(getSessionSnapshot().phase).toBe("anonymous");
  });

  it("ends the session when the server answers with something that is not a session", async () => {
    await seedStoredSession(buildCompanyUserSession());
    installFetchMock(() => ({ body: { platformAdmin: true } }));
    await verifySessionWithServer();
    expect(getSessionSnapshot().phase).toBe("anonymous");
  });

  it("OFFLINE: keeps the stored session and marks it unverified and offline", async () => {
    await seedStoredSession(buildCompanyUserSession({ grantedPermissionCodes: ["PRODUCTS.NEW_PRODUCT.VIEW"] }));
    installFetchMock(() => "network-failure");
    await verifySessionWithServer();
    const state = getSessionSnapshot();
    expect(state).toMatchObject({ phase: "authenticated", verification: "offlineUnverified", isOnline: false });
    if (state.phase === "authenticated") {
      expect(state.storedSession.currentSession.grantedPermissionCodes).toEqual(["PRODUCTS.NEW_PRODUCT.VIEW"]);
    }
  });

  it("keeps the session on a server error (500): the person did nothing wrong", async () => {
    await seedStoredSession(buildCompanyUserSession());
    installFetchMock(() => ({ status: 500, body: {} }));
    await verifySessionWithServer();
    expect(getSessionSnapshot()).toMatchObject({ phase: "authenticated", verification: "offlineUnverified" });
  });

  it("asks the server once when several guards verify at the same time", async () => {
    await seedStoredSession(buildCompanyUserSession());
    const requests = installFetchMock(() => ({ body: buildCompanyUserSession() }));
    await Promise.all([verifySessionWithServer(), verifySessionWithServer(), verifySessionWithServer()]);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("/api/v1/auth/me");
    expect(requests[0].headers.authorization).toBe("Bearer test-access-token");
  });

  it("does nothing when nobody is signed in", async () => {
    const requests = installFetchMock(() => ({ body: {} }));
    await verifySessionWithServer();
    expect(requests).toHaveLength(0);
  });

  it("forgets a selected store that the person can no longer use", async () => {
    await seedStoredSession(buildCompanyUserSession({ accessibleStoreIds: [TEST_STORE_ID, "other"] }));
    setSelectedStoreId("other");
    installFetchMock(() => ({ body: buildCompanyUserSession({ accessibleStoreIds: [TEST_STORE_ID] }) }));
    await verifySessionWithServer();
    expect(getSelectedStoreIdSnapshot()).toBe(TEST_STORE_ID); // single store: selected automatically
  });
});

describe("startSession and endSession", () => {
  it("startSession loads who the token belongs to, stores the session and marks it verified", async () => {
    const session = buildCompanyUserSession();
    const requests = installFetchMock(() => ({ body: session }));
    const result = await startSession("fresh-token");
    expect(result).toEqual({ ok: true, currentSession: session });
    expect(requests[0].headers.authorization).toBe("Bearer fresh-token");
    expect(getSessionSnapshot()).toMatchObject({ phase: "authenticated", verification: "verified" });
    expect(await readStoredValue(IndexedDatabaseKeys.storedSession)).toMatchObject({ accessToken: "fresh-token" });
  });

  it("startSession fails cleanly when the server cannot say who the token belongs to", async () => {
    installFetchMock(() => ({ status: 401, body: { detail: "Bad token." } }));
    const result = await startSession("bad");
    expect(result).toMatchObject({ ok: false, problem: { message: "Bad token." } });
    expect(getSessionSnapshot().phase).not.toBe("authenticated");
  });

  it("endSession tells the server (company logout), clears the device and the selected store", async () => {
    await seedStoredSession(buildCompanyUserSession());
    setSelectedStoreId(TEST_STORE_ID);
    const requests = installFetchMock(() => ({ status: 204 }));
    await endSession({ notifyServer: true });
    expect(requests[0]).toMatchObject({ url: "/api/v1/auth/logout", method: "POST" });
    expect(getSessionSnapshot().phase).toBe("anonymous");
    expect(await readStoredValue(IndexedDatabaseKeys.storedSession)).toBeUndefined();
    expect(getSelectedStoreIdSnapshot()).toBeNull();
  });

  it("endSession of a platform administrator calls the platform logout endpoint", async () => {
    await seedStoredSession(buildPlatformAdministratorSession());
    const requests = installFetchMock(() => ({ status: 204 }));
    await endSession({ notifyServer: true });
    expect(requests[0].url).toBe("/api/v1/platform/auth/logout");
  });

  it("endSession clears the device even when the server cannot be reached", async () => {
    await seedStoredSession(buildCompanyUserSession());
    installFetchMock(() => "network-failure");
    await endSession({ notifyServer: true });
    expect(getSessionSnapshot().phase).toBe("anonymous");
    expect(await readStoredValue(IndexedDatabaseKeys.storedSession)).toBeUndefined();
  });

  it("reportBrowserConnectivity flips the online flag of a signed-in session", async () => {
    await seedStoredSession(buildCompanyUserSession());
    reportBrowserConnectivity(false);
    expect(getSessionSnapshot()).toMatchObject({ isOnline: false });
    reportBrowserConnectivity(true);
    expect(getSessionSnapshot()).toMatchObject({ isOnline: true });
  });
});
