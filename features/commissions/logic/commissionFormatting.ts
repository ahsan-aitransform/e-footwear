import type { MessageKey } from "@/lib/i18n/messageKeys";
import type { MessageParameters } from "@/lib/i18n/translateMessage";
import { formatPercentageNumber } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { CommissionCalculationTypeCodes } from "../types/commissionTypes";

type Translate = (messageKey: MessageKey, parameters?: MessageParameters) => string;

// "3% of the base" or "40 per piece": what a plan, a rule or an entry pays, in words. Shared by the plans list, the rules list and the entries list.
export function describeCommission(
  translateMessage: Translate,
  calculationTypeCode: string,
  rate: number | null,
  fixedAmountPerPiece: number | null,
): string {
  if (calculationTypeCode === CommissionCalculationTypeCodes.percent && rate !== null) {
    return translateMessage("commissions.commission.percent", { rate: formatPercentageNumber(rate) });
  }
  if (calculationTypeCode === CommissionCalculationTypeCodes.fixedPerPiece && fixedAmountPerPiece !== null) {
    return translateMessage("commissions.commission.fixedPerPiece", { amount: formatWholeRupees(fixedAmountPerPiece, { withSymbol: false }) });
  }
  return "";
}

// "2026-01-01 to 2026-12-31", or "from 2026-01-01" for a plan with no last day.
export function describeDateRange(translateMessage: Translate, validFrom: string, validTo: string | null): string {
  return validTo ? `${validFrom} - ${validTo}` : `${validFrom} (${translateMessage("commissions.plans.openEnded")})`;
}
