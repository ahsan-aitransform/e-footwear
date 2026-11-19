import { cookies } from "next/headers";
import { PLATFORM_COOKIE, apiBaseUrl, isSameOrigin } from "@/lib/session-core";

async function forward(request: Request, method: "GET" | "POST"): Promise<Response> {
  if (!isSameOrigin(request)) return Response.json({ code: "forbidden", detail: "Cross-origin request refused." }, { status: 403 });
  const token = (await cookies()).get(PLATFORM_COOKIE)?.value;
  if (!token) return Response.json({ code: "unauthorized", detail: "Platform session expired." }, { status: 401 });

  const init: RequestInit = { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, cache: "no-store" };
  if (method === "POST") init.body = await request.text();

  const upstream = await fetch(`${apiBaseUrl()}/api/v1/platform/companies`, init).catch(() => null);
  if (!upstream) return Response.json({ code: "unavailable", detail: "The server is not reachable." }, { status: 503 });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}

export const GET = (request: Request): Promise<Response> => forward(request, "GET");
export const POST = (request: Request): Promise<Response> => forward(request, "POST");
