import { RoleCodes, isKnownRoleCode } from "@/lib/constants/roleCodes";
import type { MessageKey } from "./messageKeys";

export const roleMessageKeyByRoleCode: Record<(typeof RoleCodes)[keyof typeof RoleCodes], MessageKey> = {
  [RoleCodes.companyOwner]: "roles.companyOwner",
  [RoleCodes.storeManager]: "roles.storeManager",
  [RoleCodes.cashierSalesman]: "roles.cashierSalesman",
  [RoleCodes.accountant]: "roles.accountant",
  [RoleCodes.platformAdministrator]: "roles.platformAdministrator",
};

// Returns the message key for a known role code, or undefined for a code this build does not know
// (then the screen shows the raw code, which is better than hiding it).
export function findRoleMessageKey(roleCode: string): MessageKey | undefined {
  return isKnownRoleCode(roleCode) ? roleMessageKeyByRoleCode[roleCode] : undefined;
}
