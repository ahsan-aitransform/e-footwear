import { clearAll, getValue, setValue } from "./db";
import type { CompanyMe, Me, PlatformMe } from "../types";

// The signed-in session lives in IndexedDB, so it survives a restart and can be used offline.
// Token policy (enforced by the API): 12 hours from sign-in at most, 30 minutes of inactivity.
// A missing or refused token means "sign in again". Tokens are sent only to this app's own API.

export type StoredSession = {
  token: string;
  me: Me;
  signedInAt: string;
};

const KEY = "session";

export async function loadSession(): Promise<StoredSession | undefined> {
  return getValue<StoredSession>(KEY);
}

export async function saveSession(session: StoredSession): Promise<void> {
  await setValue(KEY, session);
}

/** Forgets the token and everything cached on this device. Used at sign-out and when the server refuses the token. */
export async function clearSession(): Promise<void> {
  await clearAll();
}

export function isPlatformSession(session: StoredSession): session is StoredSession & { me: PlatformMe } {
  return session.me.platformAdmin;
}

export function isCompanySession(session: StoredSession): session is StoredSession & { me: CompanyMe } {
  return !session.me.platformAdmin;
}
