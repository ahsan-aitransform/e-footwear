// Browser-side API client. Calls go through the same-origin proxy (/api/v1), see next.config.ts.
// A result with status 0 means the request never reached the server: the device is offline or the server is down.

export type ClientResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; offline: boolean; message: string };

export async function clientApi<T = void>(
  path: string,
  options: { method?: "GET" | "POST"; token?: string | null; body?: unknown } = {},
): Promise<ClientResult<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, offline: true, message: "No connection to the server." };
  }

  if (response.status === 204) return { ok: true, status: 204, data: undefined as T };

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (response.ok) return { ok: true, status: response.status, data: json as T };

  return {
    ok: false,
    status: response.status,
    offline: false,
    message: json?.detail ?? json?.title ?? "Something went wrong.",
  };
}
