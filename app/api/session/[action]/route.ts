import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { API_BASE, COOKIE, clearSession, sessionHeaders, setSession, setStore } from "@/lib/server/backend";

const json = (text: string, status: number) => new NextResponse(text, { status, headers: { "content-type": "application/json" } });

async function call(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> }, forwardedFor?: string | null) {
  return fetch(`${API_BASE}/api/v1${path}`, {
    method: init.method ?? "POST",
    headers: { "content-type": "application/json", ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}), ...(init.headers ?? {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
}

/** login · switch-store · logout. The session token is stored in an httpOnly cookie and never returned to the page. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const fwd = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");

  if (action === "login") {
    const r = await call("/auth/login", { body: await req.json() }, fwd);
    const text = await r.text();
    if (!r.ok) return json(text, r.status);
    const p = JSON.parse(text) as { token: string; mustChangePassword: boolean; me: unknown };
    await setSession(p.token);
    return NextResponse.json({ me: p.me, mustChangePassword: p.mustChangePassword });
  }

  if (action === "switch-store") {
    const { storeId } = (await req.json()) as { storeId: number };
    // Let the API confirm the user may work in that store before the cookie is changed.
    const r = await call("/auth/me", { method: "GET", headers: { ...(await sessionHeaders()), "x-store-id": String(storeId) } }, fwd);
    const text = await r.text();
    if (!r.ok) return json(text, r.status === 401 ? 403 : r.status);
    await setStore(storeId);
    return json(text, 200);
  }

  if (action === "logout") {
    const jar = await cookies();
    if (jar.get(COOKIE.session)?.value) await call("/auth/logout", { headers: await sessionHeaders() }, fwd).catch(() => undefined);
    await clearSession();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ code: "not_found" }, { status: 404 });
}
