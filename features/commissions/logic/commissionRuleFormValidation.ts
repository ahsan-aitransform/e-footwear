import { isValidIsoDate } from "@/components/forms/DateField";
import { validationMessage, type ValidationMessage } from "@/lib/validation/validationMessage";
import {
  CommissionCalculationTypeCodes,
  CommissionLimits,
  CommissionRuleScopeCodes,
  type SaveCommissionRuleRequest,
} from "../types/commissionTypes";

export type CommissionRuleFormValues = {
  scopeCode: string;
  categoryId: string;
  priceBandId: string;
  calculationTypeCode: string;
  rate: number | null;
  fixedAmountPerPiece: number | null;
  minimumLineAmount: number | null;
  priority: number | null;
  validFrom: string;
  validTo: string;
};

export type CommissionRuleFormErrors = Partial<Record<keyof CommissionRuleFormValues | "about", ValidationMessage>>;

// The checks of the rule form (the same as CommissionRules.EnsureRuleIsValid on the server).
export function validateCommissionRuleForm(values: CommissionRuleFormValues): CommissionRuleFormErrors {
  const errors: CommissionRuleFormErrors = {};
  const aboutId = values.scopeCode === CommissionRuleScopeCodes.category ? values.categoryId : values.priceBandId;
  if (aboutId === "") errors.about = validationMessage("commissions.rules.error.about");
  if (values.calculationTypeCode === CommissionCalculationTypeCodes.percent) {
    if (values.rate === null || values.rate < 0 || values.rate > CommissionLimits.maximumPercentage) errors.rate = validationMessage("commissions.rules.error.rate");
  } else if (values.fixedAmountPerPiece === null || !Number.isSafeInteger(values.fixedAmountPerPiece) || values.fixedAmountPerPiece < 0) {
    errors.fixedAmountPerPiece = validationMessage("commissions.rules.error.fixedAmount");
  }
  if (values.minimumLineAmount !== null && (!Number.isSafeInteger(values.minimumLineAmount) || values.minimumLineAmount < 0)) {
    errors.minimumLineAmount = validationMessage("commissions.rules.error.minimumLineAmount");
  }
  if (values.priority !== null && !Number.isSafeInteger(values.priority)) errors.priority = validationMessage("commissions.rules.error.priority");
  if (!isValidIsoDate(values.validFrom)) errors.validFrom = validationMessage("commissions.rules.error.validFrom");
  if (values.validTo !== "" && (!isValidIsoDate(values.validTo) || (isValidIsoDate(values.validFrom) && values.validTo < values.validFrom))) {
    errors.validTo = validationMessage("commissions.rules.error.dateOrder");
  }
  return errors;
}

export function hasCommissionRuleFormErrors(errors: CommissionRuleFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function buildSaveCommissionRuleRequest(values: CommissionRuleFormValues): SaveCommissionRuleRequest {
  const isPercentage = values.calculationTypeCode === CommissionCalculationTypeCodes.percent;
  return {
    scopeCode: values.scopeCode,
    productId: null,
    categoryId: values.scopeCode === CommissionRuleScopeCodes.category ? values.categoryId : null,
    priceBandId: values.scopeCode === CommissionRuleScopeCodes.priceBand ? values.priceBandId : null,
    calculationTypeCode: values.calculationTypeCode,
    rate: isPercentage ? values.rate : null,
    fixedAmountPerPiece: isPercentage ? null : values.fixedAmountPerPiece,
    minimumLineAmount: values.minimumLineAmount ?? 0,
    priority: values.priority ?? 0,
    validFrom: values.validFrom,
    validTo: values.validTo === "" ? null : values.validTo,
  };
}
