// The signed-in session of this browser. An external store: components read it with useSyncExternalStore
// (lib/session/useSessionState.ts), so no component sets React state inside an effect to follow the session.
//
// The server is the authority. The stored session only says who the browser believes is signed in; it is
// re-validated with GET /auth/me whenever a guarded layout mounts, when the connection returns, and when the tab
// regains focus. A server refusal (401/403) ends the session. A network failure keeps the stored session and marks
// it "offlineUnverified", so a device keeps working offline with the permissions it last received.
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { IndexedDatabaseKeys } from "@/lib/constants/browserStorageKeys";
import { sendApiRequest } from "@/lib/api/sendApiRequest";
import type { ApiProblem } from "@/lib/types/apiProblem";
import type { CurrentSessionResponse, SessionStoreState, StoredSession } from "@/lib/types/session";
import {
  clearAllStoredValues,
  readStoredValue,
  writeStoredValue,
} from "@/lib/storage/indexedKeyValueStore";
import { parseCurrentSessionResponse, parseStoredSession } from "./parseCurrentSession";
import { getSelectedStoreIdSnapshot, reconcileSelectedStoreWithSession, setSelectedStoreId } from "./selectedStoreStore";

const INITIALIZING_STATE: SessionStoreState = { phase: "initializing" };

let state: SessionStoreState = INITIALIZING_STATE;
const listeners = new Set<() => void>();
let initializationPromise: Promise<void> | null = null;
let verificationPromise: Promise<void> | null = null;

function setState(nextState: SessionStoreState): void {
  state = nextState;
  listeners.forEach((listener) => listener());
}

export function getSessionSnapshot(): SessionStoreState {
  return state;
}

export function getServerSessionSnapshot(): SessionStoreState {
  return INITIALIZING_STATE;
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Loads the stored session from IndexedDB once. Safe to call from many places.
export function initializeSession(): Promise<void> {
  initializationPromise ??= (async () => {
    const raw = await readStoredValue<unknown>(IndexedDatabaseKeys.storedSession);
    const storedSession = parseStoredSession(raw);
    if (storedSession) {
      reconcileSelectedStoreWithSession(storedSession.currentSession);
      setState({
        phase: "authenticated",
        storedSession,
        verification: "pending",
        isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
      });
    } else {
      setState({ phase: "anonymous" });
    }
  })();
  return initializationPromise;
}

// Asks the server who this token belongs to and updates the session with the answer.
export function verifySessionWithServer(): Promise<void> {
  verificationPromise ??= (async () => {
    try {
      await initializeSession();
      const current = state;
      if (current.phase !== "authenticated") return;
      const { storedSession } = current;

      const result = await sendApiRequest<unknown>(ApiEndpoints.authentication.currentSession, {
        accessToken: storedSession.accessToken,
      });

      if (result.ok) {
        const currentSession = parseCurrentSessionResponse(result.data);
        if (!currentSession) {
          // The server answered with something that does not match the contract: do not trust the session.
          await endSession({ notifyServer: false });
          return;
        }
        const refreshed: StoredSession = { ...storedSession, currentSession };
        await writeStoredValue(IndexedDatabaseKeys.storedSession, refreshed);
        reconcileSelectedStoreWithSession(currentSession);
        setState({ phase: "authenticated", storedSession: refreshed, verification: "verified", isOnline: true });
        return;
      }

      if (result.kind === "unauthorized" || result.kind === "forbidden") {
        // Refused by the server (expired, revoked, blocked): forget it.
        await endSession({ notifyServer: false });
        return;
      }

      // Offline, server down or a server error: keep working with what was last received.
      const latest = state;
      if (latest.phase === "authenticated") {
        setState({ ...latest, verification: "offlineUnverified", isOnline: false });
      }
    } finally {
      verificationPromise = null;
    }
  })();
  return verificationPromise;
}

export type StartSessionResult =
  | { ok: true; currentSession: CurrentSessionResponse }
  | { ok: false; problem: ApiProblem };

// Called right after a sign-in endpoint returned an access token: loads who the token belongs to, stores the session.
export async function startSession(accessToken: string): Promise<StartSessionResult> {
  const result = await sendApiRequest<unknown>(ApiEndpoints.authentication.currentSession, { accessToken });
  if (!result.ok) return { ok: false, problem: result.problem };
  const currentSession = parseCurrentSessionResponse(result.data);
  if (!currentSession) {
    return {
      ok: false,
      problem: { message: "The server answered with an unexpected session.", errorCode: null, correlationId: null, fieldErrorMessages: {} },
    };
  }
  const storedSession: StoredSession = {
    accessToken,
    signedInAtIsoTimestamp: new Date().toISOString(),
    currentSession,
  };
  await writeStoredValue(IndexedDatabaseKeys.storedSession, storedSession);
  initializationPromise = Promise.resolve();
  reconcileSelectedStoreWithSession(currentSession);
  setState({ phase: "authenticated", storedSession, verification: "verified", isOnline: true });
  return { ok: true, currentSession };
}

// Signs out. With notifyServer the server ends the session too (best effort: a failure never blocks the local
// sign-out, so a shared device is always cleared). Everything cached on the device is removed.
export async function endSession(options: { notifyServer?: boolean } = {}): Promise<void> {
  const current = state;
  if (options.notifyServer && current.phase === "authenticated" && current.isOnline) {
    const isPlatformAdministrator = current.storedSession.currentSession.audience === "PLATFORM_ADMINISTRATOR";
    await sendApiRequest(
      isPlatformAdministrator ? ApiEndpoints.platformAuthentication.logout : ApiEndpoints.authentication.logout,
      { method: "POST", accessToken: current.storedSession.accessToken },
    );
  }
  await clearAllStoredValues();
  if (getSelectedStoreIdSnapshot() !== null) setSelectedStoreId(null);
  initializationPromise = Promise.resolve();
  setState({ phase: "anonymous" });
}

// A request made with the stored token was refused (401): the session is gone.
export async function handleServerRefusedSession(): Promise<void> {
  if (state.phase === "authenticated") await endSession({ notifyServer: false });
}

export function reportBrowserConnectivity(isOnline: boolean): void {
  const current = state;
  if (current.phase !== "authenticated" || current.isOnline === isOnline) return;
  setState({ ...current, isOnline });
}

// Test helper: back to the state of a freshly loaded page.
export function resetSessionStoreForTests(): void {
  state = INITIALIZING_STATE;
  initializationPromise = null;
  verificationPromise = null;
  listeners.clear();
}
