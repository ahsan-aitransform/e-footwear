import { validationMessage, type ValidationMessage } from "@/lib/validation/validationMessage";
import { isPayrollAdjustmentTypeCode, PayrollLimits } from "../types/payrollTypes";

export type AdjustmentFormValues = { adjustmentTypeCode: string; amount: number | null; reason: string };
export type AdjustmentFormErrors = Partial<Record<keyof AdjustmentFormValues, ValidationMessage>>;

// The checks of the Adjustment dialog (incentive, deduction or advance). The server checks the same rules (PayrollRules.EnsureAdjustmentIsValid).
export function validateAdjustmentForm(values: AdjustmentFormValues): AdjustmentFormErrors {
  const errors: AdjustmentFormErrors = {};
  if (!isPayrollAdjustmentTypeCode(values.adjustmentTypeCode)) errors.adjustmentTypeCode = validationMessage("payroll.adjustment.error.type");
  if (values.amount === null || !Number.isSafeInteger(values.amount) || values.amount <= 0) errors.amount = validationMessage("payroll.adjustment.error.amount");
  if (values.reason.trim().length > PayrollLimits.adjustmentReasonMaximumLength) {
    errors.reason = validationMessage("payroll.adjustment.error.reason", { maximum: PayrollLimits.adjustmentReasonMaximumLength });
  }
  return errors;
}

export function hasAdjustmentFormErrors(errors: AdjustmentFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
