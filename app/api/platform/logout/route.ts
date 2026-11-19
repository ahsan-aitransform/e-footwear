import { cookies } from "next/headers";
import { PLATFORM_COOKIE, isSameOrigin } from "@/lib/session-core";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return Response.json({ code: "forbidden", detail: "Cross-origin request refused." }, { status: 403 });
  (await cookies()).delete(PLATFORM_COOKIE);
  return new Response(null, { status: 204 });
}
