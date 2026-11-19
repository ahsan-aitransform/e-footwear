import { cookies } from "next/headers";
import { apiBaseUrl, isSameOrigin, writeSessionCookies } from "@/lib/server/session";
import { isApiProblem, isAuthResult } from "@/lib/types";

type LoginBody = { companyCode: string; userName: string; password: string };

function parseBody(v: unknown): LoginBody | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  const { companyCode, userName, password } = r;
  if (typeof companyCode !== "string" || typeof userName !== "string" || typeof password !== "string") return null;
  if (!companyCode.trim() || !userName.trim() || !password) return null;
  return { companyCode: companyCode.trim(), userName: userName.trim(), password };
}

/** BFF login: tokens go into httpOnly cookies and are never returned to browser JavaScript. */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return Response.json({ code: "forbidden", detail: "Cross-origin request refused." }, { status: 403 });

  const body = parseBody(await request.json().catch(() => null));
  if (!body) return Response.json({ code: "bad_request", detail: "Company code, user name and password are required." }, { status: 400 });

  const upstream = await fetch(`${apiBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) return Response.json({ code: "unavailable", detail: "The server is not reachable." }, { status: 503 });

  const data: unknown = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    const detail = isApiProblem(data) ? data.detail : "Sign-in failed.";
    const code = isApiProblem(data) ? data.code : "error";
    return Response.json({ code, detail }, { status: upstream.status });
  }
  if (!isAuthResult(data)) return Response.json({ code: "bad_gateway", detail: "Unexpected server response." }, { status: 502 });

  writeSessionCookies(await cookies(), data);
  return Response.json({ mustChangePassword: data.me.mustChangePassword });
}
