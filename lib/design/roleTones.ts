import { RoleCodes } from "@/lib/constants/roleCodes";
import { ToneNames, type ToneName } from "./semanticTones";

// The badge tone of each role. Unknown role codes show as neutral.
const toneByRoleCode: Record<string, ToneName> = {
  [RoleCodes.companyOwner]: ToneNames.highlight,
  [RoleCodes.storeManager]: ToneNames.primary,
  [RoleCodes.cashierSalesman]: ToneNames.info,
  [RoleCodes.accountant]: ToneNames.success,
  [RoleCodes.platformAdministrator]: ToneNames.highlight,
};

export function toneForRoleCode(roleCode: string): ToneName {
  return toneByRoleCode[roleCode] ?? ToneNames.neutral;
}
