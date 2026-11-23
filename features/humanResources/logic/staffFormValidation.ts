import { isValidIsoDate } from "@/components/forms/DateField";
import { validationMessage, type ValidationMessage } from "@/lib/validation/validationMessage";
import { isPayFrequencyCode } from "../types/staffTypes";

export type SalaryTermsFormValues = { baseSalary: number | null; payFrequencyCode: string };
export type SalaryTermsFormErrors = Partial<Record<keyof SalaryTermsFormValues, ValidationMessage>>;

// The checks of the pay terms form (whole rupees, zero or more). The server checks the same rules (StaffRules.EnsureSalaryTermsAreValid).
export function validateSalaryTermsForm(values: SalaryTermsFormValues): SalaryTermsFormErrors {
  const errors: SalaryTermsFormErrors = {};
  if (values.baseSalary === null || !Number.isSafeInteger(values.baseSalary) || values.baseSalary < 0) {
    errors.baseSalary = validationMessage("humanResources.salaryTerms.error.baseSalary");
  }
  if (!isPayFrequencyCode(values.payFrequencyCode)) errors.payFrequencyCode = validationMessage("humanResources.salaryTerms.error.payFrequency");
  return errors;
}

export type TransferFormValues = { staffPartyId: string; toStoreId: string; effectiveOn: string };
export type TransferFormErrors = Partial<Record<keyof TransferFormValues, ValidationMessage>>;

// The checks of the Transfer staff dialog. currentStoreId is the store the chosen person works in now (empty when it is not known yet).
export function validateTransferForm(values: TransferFormValues, currentStoreId: string): TransferFormErrors {
  const errors: TransferFormErrors = {};
  if (values.staffPartyId === "") errors.staffPartyId = validationMessage("humanResources.transfer.error.staff");
  if (values.toStoreId === "") errors.toStoreId = validationMessage("humanResources.transfer.error.store");
  else if (currentStoreId !== "" && values.toStoreId === currentStoreId) errors.toStoreId = validationMessage("humanResources.transfer.error.sameStore");
  if (!isValidIsoDate(values.effectiveOn)) errors.effectiveOn = validationMessage("humanResources.transfer.error.date");
  return errors;
}

export function hasFormErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
