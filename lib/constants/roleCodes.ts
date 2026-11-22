// SINGLE SOURCE OF TRUTH FOR ROLE CODES (sec.roles in the database). Display names are message keys in
// lib/i18n/roleMessageKeys.ts; badge colours are in lib/design/roleTones.ts.

export const RoleCodes = {
  companyOwner: "COMPANY_OWNER",
  storeManager: "STORE_MANAGER",
  cashierSalesman: "CASHIER_SALESMAN",
  accountant: "ACCOUNTANT",
  platformAdministrator: "PLATFORM_ADMIN",
} as const;

export type RoleCode = (typeof RoleCodes)[keyof typeof RoleCodes];

const knownRoleCodes: ReadonlySet<string> = new Set(Object.values(RoleCodes));

export function isKnownRoleCode(value: string): value is RoleCode {
  return knownRoleCodes.has(value);
}
