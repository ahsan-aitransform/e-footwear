"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { showToast } from "@/lib/toast/toastStore";
import { ContactFormLimits } from "@/features/contacts/logic/contactFormValidation";
import {
  CustomerTypeCodes,
  type ContactDetailResponse,
  type CustomerTypeCode,
  type SaveContactRequest,
  type UpdateContactRequest,
} from "@/features/contacts/types/contactTypes";
import type { MasterListOptionResponse } from "@/features/masterData/types/masterListTypes";
import {
  CNIC_MAXIMUM_LENGTH,
  emptyCustomerForm,
  toSaveCustomerRequest,
  validateCustomerForm,
  valuesFromCustomer,
  type CustomerFormErrors,
  type CustomerFormValues,
} from "../logic/customerFormValidation";

export type SavedCustomer = { id: string; name: string; phone: string | null };

function todayAsIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Add customer; with a customerId it edits that customer. It opens on New Sale (the plus button) and on View Customers. Mount it only while it is
// open, so every opening starts with a clean form. The code is given by the server.
export function CustomerFormDialog({
  customerId,
  onClose,
  onSaved,
}: {
  customerId?: string;
  onClose: () => void;
  onSaved: (customer: SavedCustomer) => void;
}) {
  const { translateMessage } = useTranslation();
  const text = (suffix: string) => translateMessage(`customers.${suffix}` as MessageKey);
  const [values, setValues] = useState<CustomerFormValues>(emptyCustomerForm);
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [message, setMessage] = useState<string>();
  const [loadedCustomer, setLoadedCustomer] = useState<ContactDetailResponse | null>(null);

  const isEditing = customerId !== undefined;
  const customer = useApiQuery<ContactDetailResponse>(isEditing ? ApiEndpoints.customers.byId(customerId) : "", { enabled: isEditing });
  const cities = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.cities));
  const create = useApiMutation<SaveContactRequest, { id: string }>(ApiEndpoints.customers.list);
  const update = useApiMutation<UpdateContactRequest>(isEditing ? ApiEndpoints.customers.byId(customerId) : "", { method: "PUT" });

  // The loaded customer fills the form (adjusting state while rendering, not in an effect).
  if (customer.data && customer.data !== loadedCustomer) {
    setLoadedCustomer(customer.data);
    setValues(valuesFromCustomer(customer.data));
  }

  function change<TField extends keyof CustomerFormValues>(field: TField, value: CustomerFormValues[TField]) {
    setValues((current) => ({ ...current, [field]: value }));
  }
  const errorText = (field: keyof CustomerFormErrors) => (errors[field] ? text(errors[field]) : undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isEditing && !loadedCustomer) return;
    const found = validateCustomerForm(values, todayAsIsoDate());
    setErrors(found);
    setMessage(undefined);
    if (Object.keys(found).length > 0) return;

    const body = toSaveCustomerRequest(values, loadedCustomer?.statusCode);
    let savedId: string;
    if (loadedCustomer) {
      const result = await update.execute({ ...body, rowVersion: loadedCustomer.rowVersion });
      if (!result.ok) return setMessage(result.problem.message);
      savedId = loadedCustomer.id;
    } else {
      const result = await create.execute(body);
      if (!result.ok) return setMessage(result.problem.message);
      savedId = result.data.id;
    }
    showToast(text("toast.saved"), ToneNames.success);
    onSaved({ id: savedId, name: body.name, phone: body.phone });
  }

  const isLoading = isEditing && !loadedCustomer;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{text(isEditing ? "form.editTitle" : "form.addTitle")}</DialogTitle>
            <DialogDescription>{loadedCustomer ? `${text("field.code")}: ${loadedCustomer.code}` : text("form.subtitle")}</DialogDescription>
          </DialogHeader>
          <FormResultNotice errorMessage={message ?? (isEditing && customer.status === "error" ? customer.problem?.message : undefined)} />
          {isLoading ? (
            customer.status !== "error" && <LoadingIndicator />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInputField label={text("field.name")} name="customerName" required value={values.name} onChange={(event) => change("name", event.target.value)} errorMessage={errorText("name")} maxLength={ContactFormLimits.nameMaximumLength} autoFocus />
              <TextInputField label={text("field.phone")} name="customerPhone" required dir="ltr" value={values.phone} onChange={(event) => change("phone", event.target.value)} errorMessage={errorText("phone")} maxLength={ContactFormLimits.phoneMaximumLength} />
              <TextInputField label={text("field.cnic")} name="customerCnic" dir="ltr" placeholder="35202-1234567-1" value={values.cnic} onChange={(event) => change("cnic", event.target.value)} errorMessage={errorText("cnic")} maxLength={CNIC_MAXIMUM_LENGTH} />
              <FormField label={text("field.customerType")} name="customerType">
                {(controlProps) => (
                  <NativeSelect {...controlProps} value={values.customerTypeCode} onChange={(event) => change("customerTypeCode", event.target.value as CustomerTypeCode)}>
                    <option value={CustomerTypeCodes.regular}>{text("type.regular")}</option>
                    <option value={CustomerTypeCodes.special}>{text("type.premium")}</option>
                  </NativeSelect>
                )}
              </FormField>
              <DateField label={text("field.birthDate")} name="customerBirthDate" value={values.birthDate} onValueChange={(date) => change("birthDate", date)} errorMessage={errorText("birthDate")} />
              <TextInputField label={text("field.email")} name="customerEmail" type="email" dir="ltr" value={values.email} onChange={(event) => change("email", event.target.value)} errorMessage={errorText("email")} maxLength={ContactFormLimits.emailMaximumLength} />
              <FormField label={text("field.city")} name="customerCity">
                {(controlProps) => (
                  <NativeSelect {...controlProps} value={values.cityId} onChange={(event) => change("cityId", event.target.value)}>
                    <option value="">{translateMessage("masterData.none")}</option>
                    {(cities.data ?? []).map((city) => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {translateMessage("common.cancel")}
            </Button>
            {!isLoading && <SubmitButton label={translateMessage("masterData.action.save")} pendingLabel={translateMessage("masterData.action.saving")} isPending={create.isPending || update.isPending} />}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
