import { isValidIsoDate } from "@/components/forms/DateField";
import { validationMessage, type ValidationMessage } from "@/lib/validation/validationMessage";
import {
  CommissionCalculationTypeCodes,
  CommissionLimits,
  isCommissionBasisCode,
  isCommissionCalculationTypeCode,
  isCommissionPlanAppliesToCode,
  type SaveCommissionPlanRequest,
} from "../types/commissionTypes";

export type CommissionPlanFormValues = {
  name: string;
  appliesToCode: string;
  basisCode: string;
  calculationTypeCode: string;
  defaultRate: number | null;
  defaultFixedAmountPerPiece: number | null;
  minimumStoreSales: number | null;
  // "" = every store.
  storeId: string;
  validFrom: string;
  // "" = no last day.
  validTo: string;
  isActive: boolean;
  memberStaffIds: string[];
};

export type CommissionPlanFormErrors = Partial<Record<keyof CommissionPlanFormValues, ValidationMessage>>;

// The checks of the plan form. The server checks the same rules (CommissionRules): a quick message here saves a round trip.
export function validateCommissionPlanForm(values: CommissionPlanFormValues): CommissionPlanFormErrors {
  const errors: CommissionPlanFormErrors = {};
  const name = values.name.trim();
  if (name === "") errors.name = validationMessage("commissions.planForm.error.name");
  else if (name.length > CommissionLimits.planNameMaximumLength) {
    errors.name = validationMessage("commissions.planForm.error.nameTooLong", { maximum: CommissionLimits.planNameMaximumLength });
  }
  if (!isCommissionPlanAppliesToCode(values.appliesToCode)) errors.appliesToCode = validationMessage("commissions.planForm.error.appliesTo");
  if (!isCommissionBasisCode(values.basisCode)) errors.basisCode = validationMessage("commissions.planForm.error.basis");
  if (!isCommissionCalculationTypeCode(values.calculationTypeCode)) {
    errors.calculationTypeCode = validationMessage("commissions.planForm.error.calculationType");
  } else if (values.calculationTypeCode === CommissionCalculationTypeCodes.percent) {
    if (values.defaultRate === null || values.defaultRate < 0 || values.defaultRate > CommissionLimits.maximumPercentage) {
      errors.defaultRate = validationMessage("commissions.planForm.error.rate");
    }
  } else if (values.defaultFixedAmountPerPiece === null || !Number.isSafeInteger(values.defaultFixedAmountPerPiece) || values.defaultFixedAmountPerPiece < 0) {
    errors.defaultFixedAmountPerPiece = validationMessage("commissions.planForm.error.fixedAmount");
  }
  if (values.minimumStoreSales !== null && (!Number.isSafeInteger(values.minimumStoreSales) || values.minimumStoreSales < 0)) {
    errors.minimumStoreSales = validationMessage("commissions.planForm.error.minimumStoreSales");
  }
  if (!isValidIsoDate(values.validFrom)) errors.validFrom = validationMessage("commissions.planForm.error.validFrom");
  if (values.validTo !== "" && !isValidIsoDate(values.validTo)) errors.validTo = validationMessage("commissions.planForm.error.validTo");
  else if (values.validTo !== "" && isValidIsoDate(values.validFrom) && values.validTo < values.validFrom) {
    errors.validTo = validationMessage("commissions.planForm.error.dateOrder");
  }
  return errors;
}

export function hasCommissionPlanFormErrors(errors: CommissionPlanFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// The request body of a form that passed validation. A percentage plan sends no fixed amount and a fixed plan sends no percentage, as the server requires.
export function buildSaveCommissionPlanRequest(values: CommissionPlanFormValues, rowVersion: number | null): SaveCommissionPlanRequest {
  const isPercentage = values.calculationTypeCode === CommissionCalculationTypeCodes.percent;
  return {
    name: values.name.trim(),
    appliesToCode: values.appliesToCode,
    basisCode: values.basisCode,
    calculationTypeCode: values.calculationTypeCode,
    defaultRate: isPercentage ? values.defaultRate : null,
    defaultFixedAmountPerPiece: isPercentage ? null : values.defaultFixedAmountPerPiece,
    minimumStoreSales: values.minimumStoreSales ?? 0,
    storeId: values.storeId === "" ? null : values.storeId,
    validFrom: values.validFrom,
    validTo: values.validTo === "" ? null : values.validTo,
    isActive: values.isActive,
    memberStaffIds: values.memberStaffIds,
    rowVersion,
  };
}
