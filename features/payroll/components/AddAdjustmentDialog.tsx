"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { showToast } from "@/lib/toast/toastStore";
import { translateValidationMessage } from "@/lib/validation/validationMessage";
import { hasAdjustmentFormErrors, validateAdjustmentForm, type AdjustmentFormErrors, type AdjustmentFormValues } from "../logic/adjustmentFormValidation";
import {
  isPayrollAdjustmentTypeCode,
  payrollAdjustmentTypeCodeList,
  PayrollAdjustmentTypeCodes,
  type CreatedIdResponse,
  type CreatePayrollAdjustmentRequest,
  type PayrollSheetLineResponse,
} from "../types/payrollTypes";

// Enters an incentive, deduction or advance for one staff member and month (docx 3.8 "Incentive" and "Deduction" columns). The adjustment waits as its own row and
// reaches the salary sheet the next time the draft is prepared. Mount it only while it is open: it starts with empty fields every time.
export function AddAdjustmentDialog({
  line,
  salaryMonthIsoDate,
  onClose,
  onSaved,
}: {
  line: PayrollSheetLineResponse;
  salaryMonthIsoDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { translateMessage } = useTranslation();
  const [values, setValues] = useState<AdjustmentFormValues>({ adjustmentTypeCode: PayrollAdjustmentTypeCodes.incentive, amount: null, reason: "" });
  const [errors, setErrors] = useState<AdjustmentFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();

  const typeOptions: OptionSelectOption[] = payrollAdjustmentTypeCodeList.map((code) => ({ value: code, label: translateMessage(`payroll.adjustmentType.${code}`) }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateAdjustmentForm(values);
    setErrors(found);
    if (hasAdjustmentFormErrors(found) || values.amount === null || !isPayrollAdjustmentTypeCode(values.adjustmentTypeCode)) return;
    const body: CreatePayrollAdjustmentRequest = {
      staffId: line.staffId,
      month: salaryMonthIsoDate,
      adjustmentTypeCode: values.adjustmentTypeCode,
      amount: values.amount,
      reason: values.reason.trim() === "" ? null : values.reason.trim(),
    };
    setIsSaving(true);
    const result = await apiRequest<CreatedIdResponse>(ApiEndpoints.payroll.adjustments, { method: "POST", body });
    setIsSaving(false);
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("payroll.toast.adjustmentSaved"), ToneNames.success);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{translateMessage("payroll.adjustment.dialog.title", { name: line.employeeName })}</DialogTitle>
            <DialogDescription>{translateMessage("payroll.adjustment.dialog.description")}</DialogDescription>
          </DialogHeader>
          <FormResultNotice errorMessage={message} />
          <FormField label={translateMessage("payroll.adjustment.field.type")} name="payrollAdjustmentType" isRequired errorMessage={translateValidationMessage(translateMessage, errors.adjustmentTypeCode)}>
            {(controlProps) => (
              <OptionSelect {...controlProps} options={typeOptions} value={values.adjustmentTypeCode} onValueChange={(adjustmentTypeCode) => setValues((current) => ({ ...current, adjustmentTypeCode }))} />
            )}
          </FormField>
          <WholeRupeeAmountField
            label={translateMessage("payroll.adjustment.field.amount")}
            name="payrollAdjustmentAmount"
            isRequired
            value={values.amount}
            onValueChange={(amount) => setValues((current) => ({ ...current, amount }))}
            errorMessage={translateValidationMessage(translateMessage, errors.amount)}
          />
          <TextInputField
            label={translateMessage("payroll.adjustment.field.reason")}
            name="payrollAdjustmentReason"
            value={values.reason}
            onChange={(event) => setValues((current) => ({ ...current, reason: event.target.value }))}
            errorMessage={translateValidationMessage(translateMessage, errors.reason)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {translateMessage("common.cancel")}
            </Button>
            <SubmitButton label={translateMessage("payroll.adjustment.submit")} pendingLabel={translateMessage("common.pleaseWait")} isPending={isSaving} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
