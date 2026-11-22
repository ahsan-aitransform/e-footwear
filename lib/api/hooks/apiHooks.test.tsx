import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFetchMock } from "@/tests/support/fetchMock";
import { buildCompanyUserSession, resetBrowserStateForTests, seedStoredSession } from "@/tests/support/sessionFixtures";
import { useApiMutation } from "./useApiMutation";
import { useApiQuery } from "./useApiQuery";
import { usePaginatedQuery } from "./usePaginatedQuery";

beforeEach(async () => {
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useApiQuery", () => {
  it("goes from loading to success with the data", async () => {
    installFetchMock(() => ({ body: [{ id: 1 }] }));
    const { result } = renderHook(() => useApiQuery<{ id: number }[]>("/stores"));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data).toEqual([{ id: 1 }]);
    expect(result.current.source).toBe("server");
  });

  it("reports the problem on failure and flags a missing connection as offline", async () => {
    installFetchMock(() => ({ status: 500, body: { detail: "Database is down." } }));
    const failing = renderHook(() => useApiQuery("/stores"));
    await waitFor(() => expect(failing.result.current.status).toBe("error"));
    expect(failing.result.current.problem?.message).toBe("Database is down.");
    expect(failing.result.current.isOffline).toBe(false);

    installFetchMock(() => "network-failure");
    const offline = renderHook(() => useApiQuery("/stores"));
    await waitFor(() => expect(offline.result.current.status).toBe("error"));
    expect(offline.result.current.isOffline).toBe(true);
  });

  it("does not request anything while disabled or without a path", async () => {
    const requests = installFetchMock(() => ({ body: [] }));
    const disabled = renderHook(() => useApiQuery("/users", { enabled: false }));
    const noPath = renderHook(() => useApiQuery(null));
    await act(async () => undefined);
    expect(requests).toHaveLength(0);
    expect(disabled.result.current.status).toBe("loading");
    expect(noPath.result.current.status).toBe("loading");
  });

  it("asks again when the query changes and goes back to loading for the new request", async () => {
    const requests = installFetchMock((request) => ({ body: request.url }));
    const { result, rerender } = renderHook(({ companyId }) => useApiQuery<string>("/users", { query: { companyId } }), {
      initialProps: { companyId: "c1" },
    });
    await waitFor(() => expect(result.current.data).toBe("/api/v1/users?companyId=c1"));
    rerender({ companyId: "c2" });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.data).toBe("/api/v1/users?companyId=c2"));
    expect(requests).toHaveLength(2);
  });

  it("refetch asks the server again and keeps the old data on screen meanwhile (isRefreshing)", async () => {
    let counter = 0;
    installFetchMock(() => ({ body: ++counter }));
    const { result } = renderHook(() => useApiQuery<number>("/stores"));
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.data).toBe(2));
    expect(result.current.isRefreshing).toBe(false);
  });

  it("ignores the answer of a request that was replaced (no stale data from the old query)", async () => {
    const answers: Record<string, (value: Response) => void> = {};
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string) => new Promise<Response>((resolve) => (answers[input] = resolve))),
    );
    const { result, rerender } = renderHook(({ id }) => useApiQuery<string>(`/things/${id}`), { initialProps: { id: "a" } });
    rerender({ id: "b" });
    await waitFor(() => expect(Object.keys(answers)).toContain("/api/v1/things/b"));
    answers["/api/v1/things/b"](new Response(JSON.stringify("B"), { status: 200 }));
    await waitFor(() => expect(result.current.data).toBe("B"));
    answers["/api/v1/things/a"]?.(new Response(JSON.stringify("A"), { status: 200 }));
    await act(async () => undefined);
    expect(result.current.data).toBe("B");
  });

  describe("offline cache", () => {
    it("shows the saved copy when the server cannot be reached", async () => {
      await seedStoredSession(buildCompanyUserSession());
      installFetchMock(() => ({ body: [{ code: "MAIN" }] }));
      const online = renderHook(() => useApiQuery<{ code: string }[]>("/stores", { offlineCacheName: "stores" }));
      await waitFor(() => expect(online.result.current.status).toBe("success"));
      expect(online.result.current.source).toBe("server");
      expect(online.result.current.savedAtIsoTimestamp).toBeDefined();

      installFetchMock(() => "network-failure");
      const offline = renderHook(() => useApiQuery<{ code: string }[]>("/stores", { offlineCacheName: "stores" }));
      await waitFor(() => expect(offline.result.current.status).toBe("success"));
      expect(offline.result.current.data).toEqual([{ code: "MAIN" }]);
      expect(offline.result.current.source).toBe("cache");
      expect(offline.result.current.isOffline).toBe(true);
    });

    it("is an error when offline and nothing was saved", async () => {
      await seedStoredSession(buildCompanyUserSession());
      installFetchMock(() => "network-failure");
      const { result } = renderHook(() => useApiQuery("/stores", { offlineCacheName: "never-saved" }));
      await waitFor(() => expect(result.current.status).toBe("error"));
    });

    it("never shows the saved copy of another person", async () => {
      await seedStoredSession(buildCompanyUserSession({ userId: "user-a" }));
      installFetchMock(() => ({ body: ["secret of A"] }));
      const first = renderHook(() => useApiQuery("/stores", { offlineCacheName: "stores" }));
      await waitFor(() => expect(first.result.current.status).toBe("success"));

      await resetBrowserStateForTests();
      await seedStoredSession(buildCompanyUserSession({ userId: "user-b" }));
      installFetchMock(() => "network-failure");
      const second = renderHook(() => useApiQuery("/stores", { offlineCacheName: "stores" }));
      await waitFor(() => expect(second.result.current.status).toBe("error"));
      expect(second.result.current.data).toBeUndefined();
    });
  });
});

describe("usePaginatedQuery", () => {
  it("sends page, pageSize, sort and search with the filters and derives the page count", async () => {
    const requests = installFetchMock(() => ({ body: { items: [{ id: "1" }], page: 2, pageSize: 10, totalCount: 25 } }));
    const { result } = renderHook(() =>
      usePaginatedQuery<{ id: string }>("/products", {
        pageRequest: { page: 2, pageSize: 10, sort: { columnKey: "name", direction: "descending" }, search: "san" },
        filters: { storeId: "s1" },
      }),
    );
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(requests[0].url).toBe("/api/v1/products?storeId=s1&pageNumber=2&pageSize=10&sortField=name&sortDirection=Descending&searchText=san");
    expect(result.current.items).toEqual([{ id: "1" }]);
    expect(result.current.totalCount).toBe(25);
    expect(result.current.pageCount).toBe(3);
  });

  it("has one page and no items before the first answer", () => {
    installFetchMock(() => new Promise(() => undefined) as never);
    const { result } = renderHook(() =>
      usePaginatedQuery<{ id: string }>("/products", { pageRequest: { page: 1, pageSize: 25 } }),
    );
    expect(result.current.items).toEqual([]);
    expect(result.current.pageCount).toBe(1);
  });
});

describe("useApiMutation", () => {
  it("POSTs the body with a fresh idempotency key each call and reports pending state", async () => {
    const requests = installFetchMock(() => ({ status: 201, body: { id: "new" } }));
    const { result } = renderHook(() => useApiMutation<{ name: string }, { id: string }>("/stores"));

    let outcome: Awaited<ReturnType<typeof result.current.execute>> | undefined;
    await act(async () => {
      outcome = await result.current.execute({ name: "Main" });
    });
    expect(outcome).toEqual({ ok: true, status: 201, data: { id: "new" } });
    expect(requests[0]).toMatchObject({ method: "POST", url: "/api/v1/stores", body: { name: "Main" } });
    const firstKey = requests[0].headers["idempotency-key"];
    expect(firstKey).toBeTruthy();

    await act(async () => {
      await result.current.execute({ name: "Second" });
    });
    expect(requests[1].headers["idempotency-key"]).not.toBe(firstKey);
    expect(result.current.isPending).toBe(false);
  });

  it("reuses the idempotency key the caller passes (a retry of the same submission)", async () => {
    const requests = installFetchMock(() => ({ status: 201, body: {} }));
    const { result } = renderHook(() => useApiMutation("/stores"));
    await act(async () => {
      await result.current.execute(undefined as never, { idempotencyKey: "retry-key" });
      await result.current.execute(undefined as never, { idempotencyKey: "retry-key" });
    });
    expect(requests.map((request) => request.headers["idempotency-key"])).toEqual(["retry-key", "retry-key"]);
  });

  it("exposes the problem and its field errors, and reset clears them", async () => {
    installFetchMock(() => ({ status: 400, body: { detail: "Invalid.", errors: { Code: ["Too long"] } } }));
    const { result } = renderHook(() => useApiMutation("/stores"));
    await act(async () => {
      await result.current.execute(undefined as never);
    });
    expect(result.current.problem?.message).toBe("Invalid.");
    expect(result.current.fieldErrorMessages).toEqual({ code: "Too long" });
    act(() => result.current.reset());
    expect(result.current.problem).toBeUndefined();
    expect(result.current.fieldErrorMessages).toEqual({});
  });

  it("supports PUT, PATCH and DELETE", async () => {
    const requests = installFetchMock(() => ({ status: 204 }));
    const put = renderHook(() => useApiMutation("/x/1", { method: "PUT" }));
    const del = renderHook(() => useApiMutation("/x/1", { method: "DELETE" }));
    await act(async () => {
      await put.result.current.execute(undefined as never);
      await del.result.current.execute(undefined as never);
    });
    expect(requests.map((request) => request.method)).toEqual(["PUT", "DELETE"]);
  });
});
