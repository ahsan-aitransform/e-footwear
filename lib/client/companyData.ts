import { clientApi } from "./api";
import { getValue, setValue } from "./db";
import { isCompanySession, type StoredSession } from "./session";
import type { CreationOptions, Store, UserRow } from "../types";

// The screen data a company user needs, cached per user so offline screens still show something useful.
export type CompanyData = {
  stores: Store[];
  users: UserRow[];
  options: CreationOptions;
  savedAt: string;
};

export type LoadResult =
  | { source: "server"; data: CompanyData }
  | { source: "cache"; data: CompanyData }
  | { source: "none"; message: string }
  | { source: "unauthorized" };

function cacheKey(session: StoredSession) {
  const me = session.me;
  return me.platformAdmin ? "companyData:platform" : `companyData:${me.companyId}:${me.userId}`;
}

/**
 * Loads fresh data when the server answers, otherwise falls back to the saved copy.
 * A refused token (401) is reported so the caller can send the person to sign in again.
 */
export async function loadCompanyData(session: StoredSession): Promise<LoadResult> {
  if (!isCompanySession(session)) return { source: "none", message: "Platform administrators do not use company data." };
  const token = session.token;
  const [stores, users, options] = await Promise.all([
    clientApi<Store[]>("/stores", { token }),
    clientApi<UserRow[]>("/users", { token }),
    clientApi<CreationOptions>("/users/creation-options", { token }),
  ]);

  const results = [stores, users, options];
  if (results.some((r) => !r.ok && r.status === 401)) return { source: "unauthorized" };

  if (results.every((r) => r.ok)) {
    const data: CompanyData = {
      stores: stores.ok ? stores.data : [],
      users: users.ok ? users.data : [],
      options: options.ok ? options.data : { roles: [], stores: [], needsStore: false },
      savedAt: new Date().toISOString(),
    };
    await setValue(cacheKey(session), data);
    return { source: "server", data };
  }

  // Server unreachable, or a partial failure: use what was saved before.
  const cached = await getValue<CompanyData>(cacheKey(session));
  if (cached) return { source: "cache", data: cached };

  const failed = results.find((r) => !r.ok);
  return { source: "none", message: failed && !failed.ok ? failed.message : "No saved data yet." };
}

/** Removes the saved copy for this user (used after sign-out or a server refusal). */
export function cacheKeyFor(session: StoredSession): string {
  return cacheKey(session);
}
