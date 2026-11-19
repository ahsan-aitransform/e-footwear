import "server-only";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, REFRESH_COOKIE, apiBaseUrl } from "@/lib/session-core";

export { ACCESS_COOKIE, REFRESH_COOKIE, LANG_COOKIE, apiBaseUrl, writeSessionCookies, isSameOrigin } from "@/lib/session-core";

export async function readAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function clearSessionCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/** Server-side call to the API using the caller's access token. Returns the raw Response. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await readAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${apiBaseUrl()}${path}`, { ...init, headers, cache: "no-store" });
}

