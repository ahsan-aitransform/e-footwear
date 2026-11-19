import { cookies } from "next/headers";
import { ACCESS_COOKIE, REFRESH_COOKIE, apiFetch, isSameOrigin } from "@/lib/server/session";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return Response.json({ code: "forbidden", detail: "Cross-origin request refused." }, { status: 403 });

  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    // Best effort: revoke server-side; local cookies are cleared regardless.
    await apiFetch("/api/v1/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }).catch(() => null);
  }
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  return new Response(null, { status: 204 });
}
