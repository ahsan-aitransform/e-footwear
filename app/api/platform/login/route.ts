import { cookies } from "next/headers";
import { PLATFORM_COOKIE, apiBaseUrl, isSameOrigin } from "@/lib/session-core";
import { isApiProblem } from "@/lib/types";

function parseToken(v: unknown): { accessToken: string; expiresInSeconds: number } | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  return typeof r.accessToken === "string" && typeof r.expiresInSeconds === "number"
    ? { accessToken: r.accessToken, expiresInSeconds: r.expiresInSeconds }
    : null;
}

/** Platform-owner sign-in (Part 5.2, 6). The token is kept in an httpOnly cookie, never exposed to browser JS. */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return Response.json({ code: "forbidden", detail: "Cross-origin request refused." }, { status: 403 });

  const body: unknown = await request.json().catch(() => null);
  const r = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const userName = typeof r.userName === "string" ? r.userName.trim() : "";
  const password = typeof r.password === "string" ? r.password : "";
  if (!userName || !password) return Response.json({ code: "bad_request", detail: "User name and password are required." }, { status: 400 });

  const upstream = await fetch(`${apiBaseUrl()}/api/v1/platform/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, password }),
    cache: "no-store",
  }).catch(() => null);
  if (!upstream) return Response.json({ code: "unavailable", detail: "The server is not reachable." }, { status: 503 });

  const data: unknown = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return Response.json(
      isApiProblem(data) ? { code: data.code, detail: data.detail } : { code: "error", detail: "Sign-in failed." },
      { status: upstream.status },
    );
  }
  const token = parseToken(data);
  if (!token) return Response.json({ code: "bad_gateway", detail: "Unexpected server response." }, { status: 502 });

  (await cookies()).set(PLATFORM_COOKIE, token.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: token.expiresInSeconds,
  });
  return new Response(null, { status: 204 });
}
