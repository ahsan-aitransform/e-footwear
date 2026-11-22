// The lowest layer of the API client: one fetch, normalised result, no knowledge of the signed-in session.
// Application code uses apiRequest (lib/api/apiRequest.ts), which adds the token and the selected store.
// The session store uses this layer directly so that the two do not import each other.
import { API_BASE_PATH } from "@/lib/constants/apiEndpoints";
import {
  BEARER_AUTHENTICATION_SCHEME,
  HttpHeaderNames,
  JSON_MEDIA_TYPE,
} from "@/lib/constants/httpHeaders";
import type { ApiResult } from "./apiResult";
import { failureKindForStatus, normaliseApiProblem } from "./normaliseApiProblem";
import { buildQueryString, type QueryStringParameters } from "./queryString";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type SendApiRequestOptions = {
  method?: HttpMethod;
  query?: QueryStringParameters;
  body?: unknown;
  signal?: AbortSignal;
  accessToken?: string | null;
  selectedStoreId?: string | null;
  // Makes a retried POST safe (Part 26 idempotency): the server returns the first result instead of a second record.
  idempotencyKey?: string;
};

export function createClientTransactionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Fallback for very old browsers: good enough as an idempotency key, not for security.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export async function sendApiRequest<TData = void>(
  path: string,
  options: SendApiRequestOptions = {},
): Promise<ApiResult<TData>> {
  const headers: Record<string, string> = { [HttpHeaderNames.accept]: JSON_MEDIA_TYPE };
  if (options.body !== undefined) headers[HttpHeaderNames.contentType] = JSON_MEDIA_TYPE;
  if (options.accessToken) headers[HttpHeaderNames.authorization] = `${BEARER_AUTHENTICATION_SCHEME} ${options.accessToken}`;
  if (options.selectedStoreId) headers[HttpHeaderNames.selectedStoreId] = options.selectedStoreId;
  if (options.idempotencyKey) headers[HttpHeaderNames.idempotencyKey] = options.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_PATH}${path}${buildQueryString(options.query)}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, status: 0, kind: "aborted", problem: normaliseApiProblem(0, null) };
    }
    // The request never reached the server: the device is offline or the server is down.
    return { ok: false, status: 0, kind: "offline", problem: normaliseApiProblem(0, null) };
  }

  if (response.status === 204) return { ok: true, status: 204, data: undefined as TData };

  let payload: unknown = null;
  try {
    const text = await response.text();
    payload = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (response.ok) return { ok: true, status: response.status, data: payload as TData };

  return {
    ok: false,
    status: response.status,
    kind: failureKindForStatus(response.status),
    problem: normaliseApiProblem(response.status, payload),
  };
}
