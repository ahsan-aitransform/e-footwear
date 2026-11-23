import { isValidIsoDate } from "@/components/forms/DateField";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { validationMessage, type ValidationMessage } from "@/lib/validation/validationMessage";
import { isSalaryPaymentMethodCode, PayrollLimits } from "../types/payrollTypes";

export type PaymentFormValues = { amount: number | null; methodCode: string; paidOn: string; reference: string };
export type PaymentFormErrors = Partial<Record<keyof PaymentFormValues, ValidationMessage>>;

// The checks of the Pay salary dialog. The server checks the same rules (PayrollRules, PayrollSheetService): a quick message here saves a round trip.
export function validatePaymentForm(values: PaymentFormValues, outstandingAmount: number): PaymentFormErrors {
  const errors: PaymentFormErrors = {};
  if (values.amount === null || !Number.isSafeInteger(values.amount) || values.amount <= 0) errors.amount = validationMessage("payroll.pay.error.amount");
  else if (values.amount > outstandingAmount) errors.amount = validationMessage("payroll.pay.error.tooMuch", { outstanding: formatWholeRupees(outstandingAmount) });
  if (!isSalaryPaymentMethodCode(values.methodCode)) errors.methodCode = validationMessage("payroll.pay.error.method");
  if (!isValidIsoDate(values.paidOn)) errors.paidOn = validationMessage("payroll.pay.error.date");
  if (values.reference.trim().length > PayrollLimits.paymentReferenceMaximumLength) {
    errors.reference = validationMessage("payroll.pay.error.reference", { maximum: PayrollLimits.paymentReferenceMaximumLength });
  }
  return errors;
}

export function hasPaymentFormErrors(errors: PaymentFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
