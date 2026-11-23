"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { showToast } from "@/lib/toast/toastStore";
import { translateValidationMessage } from "@/lib/validation/validationMessage";
import { hasFormErrors, validateSalaryTermsForm, type SalaryTermsFormErrors, type SalaryTermsFormValues } from "../logic/staffFormValidation";
import { isPayFrequencyCode, payFrequencyCodeList, type StaffDetailResponse, type UpdateStaffSalaryTermsRequest } from "../types/staffTypes";

// The pay terms of a staff member: basic pay (whole rupees) and how often the person is paid. Saving adds a row to the salary history with today's date; sheets that
// are already approved never change. The row version makes a save fail when somebody else changed the person in between (the page then reloads the latest data).
// Mount it with key={rowVersion}: after every save and reload the form starts again from the saved values.
export function SalaryTermsForm({
  detail,
  isEditable,
  onSaved,
  onConflict,
}: {
  detail: StaffDetailResponse;
  isEditable: boolean;
  onSaved: () => void;
  onConflict: () => void;
}) {
  const { translateMessage } = useTranslation();
  const [values, setValues] = useState<SalaryTermsFormValues>({ baseSalary: detail.profile.baseSalary, payFrequencyCode: detail.profile.payFrequencyCode });
  const [errors, setErrors] = useState<SalaryTermsFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();

  const frequencyOptions: OptionSelectOption[] = payFrequencyCodeList.map((code) => ({ value: code, label: translateMessage(`humanResources.payFrequency.${code}`) }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateSalaryTermsForm(values);
    setErrors(found);
    if (hasFormErrors(found) || values.baseSalary === null || !isPayFrequencyCode(values.payFrequencyCode)) return;
    const body: UpdateStaffSalaryTermsRequest = { baseSalary: values.baseSalary, payFrequencyCode: values.payFrequencyCode, rowVersion: detail.rowVersion };
    setIsSaving(true);
    const result = await apiRequest<void>(ApiEndpoints.staff.salaryTerms(detail.profile.partyId), { method: "PUT", body });
    setIsSaving(false);
    if (!result.ok) {
      if (result.kind === "conflict") {
        setMessage(translateMessage("humanResources.salaryTerms.conflict"));
        onConflict();
        return;
      }
      return setMessage(result.problem.message);
    }
    showToast(translateMessage("humanResources.salaryTerms.saved"), ToneNames.success);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormResultNotice errorMessage={message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <WholeRupeeAmountField
          label={translateMessage("humanResources.salaryTerms.baseSalary")}
          name="staffBaseSalary"
          isRequired
          isDisabled={!isEditable}
          value={values.baseSalary}
          onValueChange={(baseSalary) => setValues((current) => ({ ...current, baseSalary }))}
          errorMessage={translateValidationMessage(translateMessage, errors.baseSalary)}
        />
        <FormField label={translateMessage("humanResources.salaryTerms.payFrequency")} name="staffPayFrequency" isRequired errorMessage={translateValidationMessage(translateMessage, errors.payFrequencyCode)}>
          {(controlProps) => (
            <OptionSelect
              {...controlProps}
              options={frequencyOptions}
              value={values.payFrequencyCode}
              isDisabled={!isEditable}
              onValueChange={(payFrequencyCode) => setValues((current) => ({ ...current, payFrequencyCode }))}
            />
          )}
        </FormField>
      </div>
      {isEditable && <SubmitButton label={translateMessage("humanResources.salaryTerms.save")} pendingLabel={translateMessage("common.pleaseWait")} isPending={isSaving} />}
    </form>
  );
}
