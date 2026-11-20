/** Client-side API helper. Talks to the same-origin proxy (/api/v1/*), which attaches the session token. */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
  /** First message for a field (also tries the "variants[0].size" → "variants" style prefix). */
  field(name: string): string | undefined {
    return this.fieldErrors[name]?.[0] ?? this.fieldErrors[name.charAt(0).toLowerCase() + name.slice(1)]?.[0];
  }
}

export type Query = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

export function qs(q?: Query): string {
  if (!q) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
    else p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

let redirecting = false;

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; query?: Query; signal?: AbortSignal; form?: FormData } = {},
): Promise<T> {
  const res = await fetch(`/api/v1${path}${qs(opts.query)}`, {
    method: opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET"),
    headers: opts.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    signal: opts.signal,
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const d = (data ?? {}) as { title?: string; code?: string; errors?: Record<string, string[]> };
    if (res.status === 401 && typeof window !== "undefined" && !redirecting) {
      redirecting = true;

      window.location.href = "/login";   // eslint-disable-line @next/next/no-location-assign-relative-destination -- a hard navigation on purpose: it drops all client state of the ended session
    }
    throw new ApiError(res.status, d.code ?? "error", d.title ?? `Request failed (${res.status})`, d.errors ?? {});
  }
  return data as T;
}

export const get = <T,>(path: string, query?: Query, signal?: AbortSignal) => api<T>(path, { query, signal });
export const post = <T,>(path: string, body?: unknown) => api<T>(path, { method: "POST", body: body ?? {} });
export const put = <T,>(path: string, body?: unknown) => api<T>(path, { method: "PUT", body: body ?? {} });
export const del = <T,>(path: string, body?: unknown) => api<T>(path, { method: "DELETE", body });

export type Page<T> = { items: T[]; total: number; pageNo: number; pageSize: number };
export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
