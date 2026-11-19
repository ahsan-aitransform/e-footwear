import "server-only";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/server/session";
import { isMe, isRoleItem, isStoreDetail, isUserItem, parseList, type Me, type RoleItem, type StoreDetail, type UserItem } from "@/lib/types";

export type LoadResult<T> = { ok: true; data: T } | { ok: false; status: number };

async function load<T>(path: string, guard: (v: unknown) => v is T): Promise<LoadResult<T>> {
  const res = await apiFetch(path).catch(() => null);
  if (!res) return { ok: false, status: 503 };
  if (res.status === 401) redirect("/login?expired=1");
  if (!res.ok) return { ok: false, status: res.status };
  const json: unknown = await res.json().catch(() => null);
  return guard(json) ? { ok: true, data: json } : { ok: false, status: 502 };
}

function listGuard<T>(item: (v: unknown) => v is T): (v: unknown) => v is T[] {
  return (v): v is T[] => parseList(v, item) !== null;
}

export const getMe = (): Promise<LoadResult<Me>> => load("/api/v1/me", isMe);
export const getStores = (): Promise<LoadResult<StoreDetail[]>> => load("/api/v1/stores", listGuard(isStoreDetail));
export const getUsers = (): Promise<LoadResult<UserItem[]>> => load("/api/v1/users", listGuard(isUserItem));
export const getRoles = (): Promise<LoadResult<RoleItem[]>> => load("/api/v1/roles", listGuard(isRoleItem));

/** UI-only check: hides what the user cannot use. The API enforces the same rule independently. */
export function can(me: Me, key: string): boolean {
  return me.isAdministrator || me.isCompanyOwner || me.permissions.includes(key);
}
