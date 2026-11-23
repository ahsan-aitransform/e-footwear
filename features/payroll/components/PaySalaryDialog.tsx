"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { showToast } from "@/lib/toast/toastStore";
import { translateValidationMessage } from "@/lib/validation/validationMessage";
import { hasPaymentFormErrors, validatePaymentForm, type PaymentFormErrors, type PaymentFormValues } from "../logic/paymentFormValidation";
import {
  isSalaryPaymentMethodCode,
  salaryPaymentMethodCodeList,
  SalaryPaymentMethodCodes,
  type PayrollSheetLineResponse,
  type PaySalaryRequest,
  type SalaryPaymentResponse,
} from "../types/payrollTypes";

// Pays all or part of an approved salary line. The payment is posted by the database (salary payable against cash or bank). One client transaction id is
// made when the dialog opens and kept for every attempt, so pressing the button again after a lost answer can never pay twice.
// Mount it only while it is open: it starts with the full outstanding amount every time.
export function PaySalaryDialog({
  line,
  onClose,
  onPaid,
}: {
  line: PayrollSheetLineResponse;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { translateMessage } = useTranslation();
  const [clientTransactionId] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState<PaymentFormValues>({ amount: line.outstandingAmount, methodCode: SalaryPaymentMethodCodes.cash, paidOn: todayAsIsoDate(), reference: "" });
  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();

  const methodOptions: OptionSelectOption[] = salaryPaymentMethodCodeList.map((code) => ({ value: code, label: translateMessage(`payroll.method.${code}`) }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validatePaymentForm(values, line.outstandingAmount);
    setErrors(found);
    if (hasPaymentFormErrors(found) || values.amount === null || !isSalaryPaymentMethodCode(values.methodCode)) return;
    const body: PaySalaryRequest = {
      amount: values.amount,
      methodCode: values.methodCode,
      paidOn: values.paidOn,
      reference: values.reference.trim() === "" ? null : values.reference.trim(),
      clientTransactionId,
    };
    setIsSaving(true);
    const result = await apiRequest<SalaryPaymentResponse>(ApiEndpoints.payroll.linePayments(line.lineId), { method: "POST", body, idempotencyKey: clientTransactionId });
    setIsSaving(false);
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("payroll.toast.paid"), ToneNames.success);
    onPaid();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{translateMessage("payroll.pay.dialog.title", { name: line.employeeName })}</DialogTitle>
            <DialogDescription>
              {translateMessage("payroll.pay.dialog.description", {
                netPay: formatWholeRupees(line.netPay),
                paid: formatWholeRupees(line.paidAmount),
                outstanding: formatWholeRupees(line.outstandingAmount),
              })}
            </DialogDescription>
          </DialogHeader>
          <FormResultNotice errorMessage={message} />
          <WholeRupeeAmountField
            label={translateMessage("payroll.pay.field.amount")}
            name="payrollPayAmount"
            isRequired
            value={values.amount}
            onValueChange={(amount) => setValues((current) => ({ ...current, amount }))}
            errorMessage={translateValidationMessage(translateMessage, errors.amount)}
          />
          <FormField label={translateMessage("payroll.pay.field.method")} name="payrollPayMethod" isRequired errorMessage={translateValidationMessage(translateMessage, errors.methodCode)}>
            {(controlProps) => (
              <OptionSelect {...controlProps} options={methodOptions} value={values.methodCode} onValueChange={(methodCode) => setValues((current) => ({ ...current, methodCode }))} />
            )}
          </FormField>
          <DateField
            label={translateMessage("payroll.pay.field.paidOn")}
            name="payrollPayDate"
            isRequired
            value={values.paidOn}
            onValueChange={(paidOn) => setValues((current) => ({ ...current, paidOn }))}
            errorMessage={translateValidationMessage(translateMessage, errors.paidOn)}
          />
          <TextInputField
            label={translateMessage("payroll.pay.field.reference")}
            name="payrollPayReference"
            value={values.reference}
            onChange={(event) => setValues((current) => ({ ...current, reference: event.target.value }))}
            errorMessage={translateValidationMessage(translateMessage, errors.reference)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {translateMessage("common.cancel")}
            </Button>
            <SubmitButton label={translateMessage("payroll.pay.submit")} pendingLabel={translateMessage("common.pleaseWait")} isPending={isSaving} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
