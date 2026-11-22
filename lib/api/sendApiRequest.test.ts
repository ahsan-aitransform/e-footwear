import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFetchMock } from "@/tests/support/fetchMock";
import {
  TEST_STORE_ID,
  buildCompanyUserSession,
  resetBrowserStateForTests,
  seedStoredSession,
} from "@/tests/support/sessionFixtures";
import { getSessionSnapshot } from "@/lib/session/sessionStore";
import { setSelectedStoreId } from "@/lib/session/selectedStoreStore";
import { apiRequest } from "./apiRequest";
import { buildQueryString, formatSortParameters, pageRequestToQueryParameters } from "./queryString";
import { createClientTransactionId, sendApiRequest } from "./sendApiRequest";

beforeEach(async () => {
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendApiRequest", () => {
  it("sends JSON with the token, the selected store and the idempotency key, and returns the data", async () => {
    const requests = installFetchMock(() => ({ status: 201, body: { id: "abc" } }));
    const result = await sendApiRequest<{ id: string }>("/users", {
      method: "POST",
      body: { email: "a@b.test" },
      accessToken: "token-1",
      selectedStoreId: TEST_STORE_ID,
      idempotencyKey: "key-1",
    });

    expect(result).toEqual({ ok: true, status: 201, data: { id: "abc" } });
    expect(requests[0].url).toBe("/api/v1/users");
    expect(requests[0].method).toBe("POST");
    expect(requests[0].headers).toMatchObject({
      accept: "application/json",
      "content-type": "application/json",
      authorization: "Bearer token-1",
      "x-store-id": TEST_STORE_ID,
      "idempotency-key": "key-1",
    });
    expect(requests[0].body).toEqual({ email: "a@b.test" });
  });

  it("sends no Authorization header without a token and no body header for a GET", async () => {
    const requests = installFetchMock(() => ({ body: [] }));
    await sendApiRequest("/stores");
    expect(requests[0].headers.authorization).toBeUndefined();
    expect(requests[0].headers["content-type"]).toBeUndefined();
  });

  it("appends the query string", async () => {
    const requests = installFetchMock(() => ({ body: [] }));
    await sendApiRequest("/users", { query: { companyId: "c1", search: "", page: 2 } });
    expect(requests[0].url).toBe("/api/v1/users?companyId=c1&page=2");
  });

  it("answers ok with undefined data for 204 No Content", async () => {
    installFetchMock(() => ({ status: 204 }));
    expect(await sendApiRequest("/auth/logout", { method: "POST" })).toEqual({ ok: true, status: 204, data: undefined });
  });

  it("normalises RFC 7807 ProblemDetails, with field errors keyed in camelCase", async () => {
    installFetchMock(() => ({
      status: 400,
      body: {
        title: "Validation failed",
        detail: "The email is not valid.",
        errorCode: "VALIDATION_FAILED",
        correlationId: "corr-9",
        errors: { Email: ["Not an email", "second"], "Items[0].UnitPrice": ["Too low"] },
      },
    }));
    const result = await sendApiRequest("/users", { method: "POST", body: {} });
    expect(result).toMatchObject({
      ok: false,
      status: 400,
      kind: "validation",
      problem: {
        message: "The email is not valid.",
        errorCode: "VALIDATION_FAILED",
        correlationId: "corr-9",
        fieldErrorMessages: { email: "Not an email", "items[0].unitPrice": "Too low" },
      },
    });
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "notFound"],
    [409, "conflict"],
    [423, "conflict"],
    [429, "rateLimited"],
    [500, "serverError"],
    [503, "serverError"],
    [418, "unknown"],
  ])("maps HTTP %i to the failure kind %s", async (status, kind) => {
    installFetchMock(() => ({ status, body: { title: "x" } }));
    expect(await sendApiRequest("/x")).toMatchObject({ ok: false, status, kind });
  });

  it("falls back to a generic message when the error has no body", async () => {
    installFetchMock(() => ({ status: 500 }));
    const result = await sendApiRequest("/x");
    expect(result).toMatchObject({ ok: false, problem: { message: "Something went wrong.", errorCode: null, fieldErrorMessages: {} } });
  });

  it("reports a request that never reached the server as offline (status 0)", async () => {
    installFetchMock(() => "network-failure");
    expect(await sendApiRequest("/stores")).toMatchObject({
      ok: false,
      status: 0,
      kind: "offline",
      problem: { message: "No connection to the server." },
    });
  });

  it("reports a cancelled request as aborted, not offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")));
    expect(await sendApiRequest("/stores")).toMatchObject({ ok: false, kind: "aborted" });
  });
});

describe("apiRequest (with the session)", () => {
  it("adds the stored token and the selected store", async () => {
    await seedStoredSession(buildCompanyUserSession());
    setSelectedStoreId(TEST_STORE_ID);
    const requests = installFetchMock(() => ({ body: [] }));
    await apiRequest("/stores");
    expect(requests[0].headers.authorization).toBe("Bearer test-access-token");
    expect(requests[0].headers["x-store-id"]).toBe(TEST_STORE_ID);
  });

  it("sends no token for the sign-in endpoints (authentication: none)", async () => {
    await seedStoredSession(buildCompanyUserSession());
    const requests = installFetchMock(() => ({ body: { accessToken: "t" } }));
    await apiRequest("/auth/login", { method: "POST", authentication: "none", body: {} });
    expect(requests[0].headers.authorization).toBeUndefined();
  });

  it("ends the session when the server refuses the token", async () => {
    await seedStoredSession(buildCompanyUserSession());
    installFetchMock(() => ({ status: 401, body: { title: "Unauthorized" } }));
    const result = await apiRequest("/stores");
    expect(result).toMatchObject({ ok: false, kind: "unauthorized" });
    expect(getSessionSnapshot().phase).toBe("anonymous");
  });

  it("keeps a failed sign-in attempt from ending anything (no token was sent)", async () => {
    installFetchMock(() => ({ status: 401, body: { detail: "Wrong password." } }));
    const result = await apiRequest("/auth/login", { method: "POST", authentication: "none", body: {} });
    expect(result).toMatchObject({ ok: false, problem: { message: "Wrong password." } });
  });
});

describe("query string helpers", () => {
  it("leaves out empty values and repeats array values", () => {
    expect(buildQueryString({ a: 1, b: "", c: null, d: undefined, e: [1, 2], f: false })).toBe("?a=1&e=1&e=2&f=false");
    expect(buildQueryString({})).toBe("");
    expect(buildQueryString(undefined)).toBe("");
  });

  it("writes the sort as sortField and sortDirection, and nothing when there is no sort", () => {
    expect(formatSortParameters({ columnKey: "name", direction: "ascending" })).toEqual({ sortField: "name", sortDirection: "Ascending" });
    expect(formatSortParameters({ columnKey: "name", direction: "descending" })).toEqual({ sortField: "name", sortDirection: "Descending" });
    expect(formatSortParameters(undefined)).toEqual({});
  });

  it("turns a page request into the parameter names the API binds (pageNumber, pageSize, sortField, sortDirection, searchText)", () => {
    expect(
      buildQueryString(pageRequestToQueryParameters({ page: 2, pageSize: 10, sort: { columnKey: "name", direction: "descending" }, search: "  bata " })),
    ).toBe("?pageNumber=2&pageSize=10&sortField=name&sortDirection=Descending&searchText=bata");
    expect(buildQueryString(pageRequestToQueryParameters({ page: 1, pageSize: 25 }))).toBe("?pageNumber=1&pageSize=25");
  });
});

describe("createClientTransactionId", () => {
  it("makes a new UUID each time", () => {
    const first = createClientTransactionId();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(createClientTransactionId()).not.toBe(first);
  });
});
