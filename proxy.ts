import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, PLATFORM_COOKIE, REFRESH_COOKIE, writeSessionCookies, apiBaseUrl } from "@/lib/session-core";
import { isAuthResult } from "@/lib/types";

/**
 * Optimistic session gate (not authorization: the API enforces permissions on every call).
 * - No access cookie but a refresh cookie: rotate the session once, then continue.
 * - No session at all: send to /login. Logged-in users are kept away from /login.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Platform-owner area has its own session and never mixes with company-user sessions.
  if (pathname === "/platform" || pathname.startsWith("/platform/")) {
    const hasPlatform = request.cookies.has(PLATFORM_COOKIE);
    const isPlatformLogin = pathname === "/platform/login";
    if (!hasPlatform && !isPlatformLogin) return NextResponse.redirect(new URL("/platform/login", request.url));
    if (hasPlatform && isPlatformLogin && !request.nextUrl.searchParams.has("expired")) return NextResponse.redirect(new URL("/platform", request.url));
    return NextResponse.next();
  }

  const isLogin = pathname === "/login";
  const isApi = pathname.startsWith("/api/");

  let hasAccess = request.cookies.has(ACCESS_COOKIE);
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let refreshed: NextResponse | null = null;

  if (!hasAccess && refresh && !pathname.startsWith("/api/auth")) {
    const res = await fetch(`${apiBaseUrl()}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: "no-store",
    }).catch(() => null);
    const data: unknown = res && res.ok ? await res.json().catch(() => null) : null;
    if (isAuthResult(data)) {
      // Make the new token visible to this same request, then persist it in the browser.
      const headers = new Headers(request.headers);
      const others = request.cookies.getAll().filter((c) => c.name !== ACCESS_COOKIE && c.name !== REFRESH_COOKIE)
        .map((c) => `${c.name}=${c.value}`);
      headers.set("cookie", [...others, `${ACCESS_COOKIE}=${data.accessToken}`, `${REFRESH_COOKIE}=${data.refreshToken}`].join("; "));
      refreshed = NextResponse.next({ request: { headers } });
      writeSessionCookies(refreshed.cookies, data);
      hasAccess = true;
    }
  }

  if (!hasAccess && !isLogin && !isApi) return NextResponse.redirect(new URL("/login", request.url));
  if (hasAccess && isLogin && !request.nextUrl.searchParams.has("expired")) return NextResponse.redirect(new URL("/", request.url));
  return refreshed ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
