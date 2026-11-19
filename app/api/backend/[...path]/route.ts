import type { NextRequest } from "next/server";
import { apiFetch, isSameOrigin } from "@/lib/server/session";

// Only these API areas are reachable through the browser proxy (no open proxy / SSRF).
const ALLOWED_PREFIXES = ["stores", "users", "roles", "permissions", "me", "auth/change-password"] as const;

function isAllowed(path: string): boolean {
  return ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

async function forward(request: NextRequest, ctx: RouteContext<"/api/backend/[...path]">): Promise<Response> {
  if (!isSameOrigin(request)) return Response.json({ code: "forbidden", detail: "Cross-origin request refused." }, { status: 403 });

  const { path } = await ctx.params;
  const joined = path.join("/");
  if (path.some((s) => s === ".." || s === ".") || !isAllowed(joined)) {
    return Response.json({ code: "not_found", detail: "Not found." }, { status: 404 });
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const init: RequestInit = { method: request.method };
  if (hasBody) init.body = await request.text();

  const upstream = await apiFetch(`/api/v1/${joined}${request.nextUrl.search}`, init).catch(() => null);
  if (!upstream) return Response.json({ code: "unavailable", detail: "The server is not reachable." }, { status: 503 });

  return new Response(upstream.status === 204 ? null : await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
