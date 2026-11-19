import { cookies } from "next/headers";
import { isLocale } from "@/i18n/messages";
import { LANG_COOKIE, isSameOrigin } from "@/lib/server/session";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return Response.json({ code: "forbidden", detail: "Cross-origin request refused." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  const locale = typeof body === "object" && body !== null ? (body as Record<string, unknown>).locale : undefined;
  if (!isLocale(locale)) return Response.json({ code: "bad_request", detail: "Unknown language." }, { status: 400 });
  (await cookies()).set(LANG_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: 365 * 24 * 60 * 60 });
  return new Response(null, { status: 204 });
}
