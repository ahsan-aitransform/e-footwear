import { NextRequest, NextResponse } from "next/server";
import { API_BASE, COOKIE, sessionHeaders } from "@/lib/server/backend";

/** Same-origin proxy to the .NET API: adds the bearer session and the working store from httpOnly cookies. */
async function handle(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const auth = await sessionHeaders();
  if (!auth.authorization) return NextResponse.json({ code: "unauthorized", title: "Not signed in." }, { status: 401 });

  const headers = new Headers(auth);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const fwd = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
  if (fwd) headers.set("x-forwarded-for", fwd);
  const device = req.headers.get("x-device");
  if (device) headers.set("x-device", device);

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const res = await fetch(`${API_BASE}/api/v1/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`, {
    method: req.method, headers, body: hasBody ? req.body : undefined, duplex: "half", cache: "no-store",
  } as RequestInit);

  const out = new NextResponse(res.status === 204 ? null : res.body, { status: res.status });
  for (const h of ["content-type", "content-disposition", "cache-control"]) {
    const v = res.headers.get(h);
    if (v) out.headers.set(h, v);
  }
  // The API says the session is over (expired, revoked, blocked): drop the cookie so the gate sends the user to sign in.
  if (res.status === 401) out.cookies.delete(COOKIE.session);
  return out;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
