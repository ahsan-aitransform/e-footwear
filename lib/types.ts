// Shapes returned by e-footwear-api (Phase 3: auth, stores, users). Validated at the boundary, never trusted blindly.

export type Store = { id: number; code: string; name: string };

export type Me = {
  userId: number;
  companyId: number;
  userName: string;
  displayName: string | null;
  isAdministrator: boolean;
  isCompanyOwner: boolean;
  mustChangePassword: boolean;
  stores: Store[];
  permissions: string[];
};

export type StoreDetail = {
  id: number;
  code: string;
  name: string;
  nameUr: string | null;
  address: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  cityName: string | null;
  isActive: boolean;
};

export type UserItem = {
  id: number;
  userName: string;
  displayName: string | null;
  email: string | null;
  status: "ACTIVE" | "BLOCKED";
  isAdministrator: boolean;
  isCompanyOwner: boolean;
  lastLoginAt: string | null;
  roleIds: number[];
  storeIds: number[];
};

export type RoleItem = { id: number; name: string; isSystem: boolean; permissionKeys: string[] };

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  storeId: number;
  me: Me;
};

export type CompanyItem = { id: number; code: string; name: string; status: string; createdAt: string };

export function isCompanyItem(v: unknown): v is CompanyItem {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === "number" && typeof r.code === "string" && typeof r.name === "string"
    && typeof r.status === "string" && typeof r.createdAt === "string";
}

export type ApiProblem = { code: string; detail: string };

// ---- type guards -------------------------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}
function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === "number");
}
function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function isStore(v: unknown): v is Store {
  return isRecord(v) && typeof v.id === "number" && typeof v.code === "string" && typeof v.name === "string";
}

export function isMe(v: unknown): v is Me {
  return (
    isRecord(v) &&
    typeof v.userId === "number" &&
    typeof v.companyId === "number" &&
    typeof v.userName === "string" &&
    isStringOrNull(v.displayName ?? null) &&
    typeof v.isAdministrator === "boolean" &&
    typeof v.isCompanyOwner === "boolean" &&
    typeof v.mustChangePassword === "boolean" &&
    Array.isArray(v.stores) &&
    v.stores.every(isStore) &&
    isStringArray(v.permissions)
  );
}

export function isAuthResult(v: unknown): v is AuthResult {
  return (
    isRecord(v) &&
    typeof v.accessToken === "string" &&
    typeof v.refreshToken === "string" &&
    typeof v.expiresInSeconds === "number" &&
    typeof v.storeId === "number" &&
    isMe(v.me)
  );
}

export function isStoreDetail(v: unknown): v is StoreDetail {
  return (
    isRecord(v) &&
    typeof v.id === "number" &&
    typeof v.code === "string" &&
    typeof v.name === "string" &&
    typeof v.isActive === "boolean"
  );
}

export function isUserItem(v: unknown): v is UserItem {
  return (
    isRecord(v) &&
    typeof v.id === "number" &&
    typeof v.userName === "string" &&
    (v.status === "ACTIVE" || v.status === "BLOCKED") &&
    typeof v.isAdministrator === "boolean" &&
    typeof v.isCompanyOwner === "boolean" &&
    isNumberArray(v.roleIds) &&
    isNumberArray(v.storeIds)
  );
}

export function isRoleItem(v: unknown): v is RoleItem {
  return isRecord(v) && typeof v.id === "number" && typeof v.name === "string" && isStringArray(v.permissionKeys);
}

export function isApiProblem(v: unknown): v is ApiProblem {
  return isRecord(v) && typeof v.detail === "string" && typeof v.code === "string";
}

export function parseList<T>(v: unknown, guard: (x: unknown) => x is T): T[] | null {
  return Array.isArray(v) && v.every(guard) ? v : null;
}
