import { vi } from "vitest";

export type MockedApiResponse = { status?: number; body?: unknown };
export type RecordedRequest = { url: string; method: string; headers: Record<string, string>; body: unknown };

// Replaces fetch for one test. The handler gets the request path (with query string, without the /api/v1 prefix is NOT
// removed: it sees the real URL) and answers with a status and a JSON body. Returns the list of requests it saw.
export function installFetchMock(
  handler: (request: RecordedRequest) => MockedApiResponse | "network-failure",
): RecordedRequest[] {
  const recorded: RecordedRequest[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      // like a real browser: a request whose signal is already aborted never goes out
      if (init?.signal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");
      const headers: Record<string, string> = {};
      new Headers(init?.headers).forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      const request: RecordedRequest = {
        url: String(input),
        method: init?.method ?? "GET",
        headers,
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      };
      recorded.push(request);
      const answer = handler(request);
      if (answer === "network-failure") throw new TypeError("Failed to fetch");
      const status = answer.status ?? 200;
      if (status === 204) return new Response(null, { status });
      return new Response(JSON.stringify(answer.body ?? null), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return recorded;
}
