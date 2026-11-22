// Uploading a file and showing a picture that only a signed-in person may fetch. Both need the session token, so they live
// next to apiRequest. Nothing throws: the upload answers an ApiResult, the picture answers a temporary URL or null.
import { API_BASE_PATH } from "@/lib/constants/apiEndpoints";
import { BEARER_AUTHENTICATION_SCHEME, HttpHeaderNames, JSON_MEDIA_TYPE } from "@/lib/constants/httpHeaders";
import { getSelectedStoreIdSnapshot } from "@/lib/session/selectedStoreStore";
import { getSessionSnapshot, handleServerRefusedSession, initializeSession } from "@/lib/session/sessionStore";
import type { ApiResult } from "./apiResult";
import { failureKindForStatus, normaliseApiProblem } from "./normaliseApiProblem";

const MULTIPART_FILE_FIELD_NAME = "file";

async function buildSessionHeaders(): Promise<{ headers: Record<string, string>; hasToken: boolean }> {
  await initializeSession();
  const state = getSessionSnapshot();
  const accessToken = state.phase === "authenticated" ? state.storedSession.accessToken : null;
  const headers: Record<string, string> = {};
  if (accessToken) headers[HttpHeaderNames.authorization] = `${BEARER_AUTHENTICATION_SCHEME} ${accessToken}`;
  const selectedStoreId = getSelectedStoreIdSnapshot();
  if (selectedStoreId) headers[HttpHeaderNames.selectedStoreId] = selectedStoreId;
  return { headers, hasToken: accessToken !== null };
}

// Sends one file as multipart/form-data (PUT by default; POST for an endpoint that reads a file and answers a preview). The browser sets the multipart boundary itself, so no content type is given.
export async function uploadApiFile<TData = void>(path: string, file: File, method: "PUT" | "POST" = "PUT"): Promise<ApiResult<TData>> {
  const { headers, hasToken } = await buildSessionHeaders();
  headers[HttpHeaderNames.accept] = JSON_MEDIA_TYPE;
  const form = new FormData();
  form.append(MULTIPART_FILE_FIELD_NAME, file, file.name);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_PATH}${path}`, { method, headers, body: form, cache: "no-store" });
  } catch {
    return { ok: false, status: 0, kind: "offline", problem: normaliseApiProblem(0, null) };
  }

  let payload: unknown = null;
  try {
    const text = await response.text();
    payload = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (response.ok) return { ok: true, status: response.status, data: payload as TData };

  const kind = failureKindForStatus(response.status);
  if (kind === "unauthorized" && hasToken) await handleServerRefusedSession();
  return { ok: false, status: response.status, kind, problem: normaliseApiProblem(response.status, payload) };
}

// Fetches a picture with the session token and returns a temporary object URL for an <img>, or null when there is none.
// The caller releases it with URL.revokeObjectURL when the picture is no longer shown.
export async function fetchApiImageObjectUrl(path: string): Promise<string | null> {
  const { headers } = await buildSessionHeaders();
  try {
    const response = await fetch(`${API_BASE_PATH}${path}`, { method: "GET", headers, cache: "no-store" });
    if (!response.ok) return null;
    return URL.createObjectURL(await response.blob());
  } catch {
    return null;
  }
}
