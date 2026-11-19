import type { AuthResult } from "@/lib/types";

export const ACCESS_COOKIE = "efw_at";
export const REFRESH_COOKIE = "efw_rt";
export const LANG_COOKIE = "efw_lang";
/** Platform-administrator session (Part 5.2): separate from company-user cookies, short-lived, no refresh. */
export const PLATFORM_COOKIE = "efw_pat";

const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // matches API default Jwt:RefreshDays; the server stays authoritative

export function apiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) throw new Error("API_BASE_URL is not set (server-side environment variable).");
  return url.replace(/\/$/, "");
}

export type CookieSetter = {
  set(name: string, value: string, options: {
    httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; maxAge: number;
  }): unknown;
};

export function writeSessionCookies(jar: CookieSetter, session: Pick<AuthResult, "accessToken" | "refreshToken" | "expiresInSeconds">): void {
  const secure = process.env.NODE_ENV === "production";
  jar.set(ACCESS_COOKIE, session.accessToken, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: session.expiresInSeconds });
  jar.set(REFRESH_COOKIE, session.refreshToken, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: REFRESH_MAX_AGE_SECONDS });
}

/** Browser requests must come from our own origin (defence in depth on top of SameSite=Lax cookies). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
