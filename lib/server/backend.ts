import "server-only";
import { cookies } from "next/headers";

/**
 * Server-side half of the backend-for-frontend. The browser never sees the session token: it lives in an httpOnly cookie that only
 * these route handlers read (Part 31). The API validates the session on every call, so the cookie is only a carrier.
 */
export const API_BASE = (process.env.API_BASE_URL ?? "http://localhost:5069").replace(/\/$/, "");

export const COOKIE = { session: "efw_sid", store: "efw_store" } as const;

const secure = process.env.NODE_ENV === "production";
const base = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };

/** The API's absolute session limit defaults to 12 hours (sec.auth_policy.session_max_hours); the API is the authority, the cookie just expires with it. */
const SESSION_SECONDS = 12 * 60 * 60;

export async function setSession(token: string) {
  const jar = await cookies();
  jar.set(COOKIE.session, token, { ...base, maxAge: SESSION_SECONDS });
  jar.delete(COOKIE.store);   // a new sign-in starts in the user's default store
}

export async function setStore(storeId: number) {
  const jar = await cookies();
  jar.set(COOKIE.store, String(storeId), { ...base, maxAge: SESSION_SECONDS });
}

export async function clearSession() {
  const jar = await cookies();
  for (const n of Object.values(COOKIE)) jar.delete(n);
}

export async function sessionHeaders(): Promise<Record<string, string>> {
  const jar = await cookies();
  const h: Record<string, string> = {};
  const token = jar.get(COOKIE.session)?.value;
  const store = jar.get(COOKIE.store)?.value;
  if (token) h.authorization = `Bearer ${token}`;
  if (store) h["x-store-id"] = store;
  return h;
}
