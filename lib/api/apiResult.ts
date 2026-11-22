import type { ApiFailureKind, ApiProblem } from "@/lib/types/apiProblem";

// Every API call answers with one of these two shapes; nothing throws. A screen checks `ok` and either uses `data`
// or shows `problem.message` (and, in a form, `problem.fieldErrorMessages` next to the fields).
export type ApiSuccess<TData> = { ok: true; status: number; data: TData };

export type ApiFailure = {
  ok: false;
  // 0 when the request never reached the server (offline, server down) or was cancelled.
  status: number;
  kind: ApiFailureKind;
  problem: ApiProblem;
};

export type ApiResult<TData> = ApiSuccess<TData> | ApiFailure;

export function isOfflineFailure(result: ApiResult<unknown>): result is ApiFailure {
  return !result.ok && result.kind === "offline";
}

export function isUnauthorizedFailure(result: ApiResult<unknown>): result is ApiFailure {
  return !result.ok && result.kind === "unauthorized";
}
