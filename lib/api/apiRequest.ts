// The API client every screen uses. It adds what a signed-in request needs (the access token and the selected store)
// and ends the session when the server refuses the token. Nothing throws: the answer is an ApiResult.
//
//   const result = await apiRequest<StoreSummaryResponse[]>(ApiEndpoints.stores.listAccessibleStores);
//   if (!result.ok) showMessage(result.problem.message);
//
// authentication: "none" is for the sign-in endpoints, which have no token yet.
import { getSelectedStoreIdSnapshot } from "@/lib/session/selectedStoreStore";
import { getSessionSnapshot, handleServerRefusedSession, initializeSession } from "@/lib/session/sessionStore";
import type { ApiResult } from "./apiResult";
import { normaliseApiProblem } from "./normaliseApiProblem";
import { sendApiRequest, type SendApiRequestOptions } from "./sendApiRequest";

export type ApiRequestOptions = Omit<SendApiRequestOptions, "accessToken" | "selectedStoreId"> & {
  authentication?: "session" | "none";
  // Overrides the selected store for this call (for example a platform administrator naming a company's store).
  selectedStoreId?: string | null;
};

export async function apiRequest<TData = void>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<TData>> {
  const { authentication = "session", selectedStoreId, ...sendOptions } = options;
  if (authentication === "none") return sendApiRequest<TData>(path, sendOptions);

  await initializeSession();
  // A screen that was closed while the session was being read must not send its request any more.
  if (sendOptions.signal?.aborted) return { ok: false, status: 0, kind: "aborted", problem: normaliseApiProblem(0, null) };
  const state = getSessionSnapshot();
  const accessToken = state.phase === "authenticated" ? state.storedSession.accessToken : null;

  const result = await sendApiRequest<TData>(path, {
    ...sendOptions,
    accessToken,
    selectedStoreId: selectedStoreId === undefined ? getSelectedStoreIdSnapshot() : selectedStoreId,
  });

  if (!result.ok && result.kind === "unauthorized" && accessToken) await handleServerRefusedSession();
  return result;
}
