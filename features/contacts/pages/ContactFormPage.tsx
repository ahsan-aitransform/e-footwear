"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import type { StoreSummaryResponse } from "@/lib/types/store";
import type { MasterListOptionResponse } from "@/features/masterData/types/masterListTypes";
import {
  ContactFormLimits,
  createEmptyContactForm,
  hasContactFormErrors,
  toSaveContactRequest,
  validateContactForm,
  type ContactFormErrors,
  type ContactFormValues,
} from "../logic/contactFormValidation";
import type { ContactScreenConfig } from "../types/contactScreenConfig";
import {
  ContactStatusCodes,
  OpeningBalanceSideCodes,
  type ContactDetailResponse,
  type SaveContactRequest,
  type UpdateContactRequest,
} from "../types/contactTypes";

function todayAsIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function valuesFromContact(contact: ContactDetailResponse, todayIsoDate: string): ContactFormValues {
  return {
    name: contact.name,
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    birthDate: contact.birthDate ?? "",
    cityId: contact.cityId ?? "",
    statusCode: contact.statusCode,
    creditLimit: contact.creditLimit ?? null,
    designation: contact.designation ?? "",
    isManager: contact.isManager ?? false,
    storeId: contact.storeId ?? "",
    openingBalanceSideCode: contact.openingBalance?.sideCode ?? OpeningBalanceSideCodes.debit,
    openingBalanceAmount: contact.openingBalance?.amount ?? null,
    openingBalanceAsOfDate: contact.openingBalance?.asOfDate ?? todayIsoDate,
  };
}

// New Vendor / New Staff and their edit pages share this form (customers use CustomerFormDialog); the config says which kind it is. The code is given by
// the server. A new staff member needs a store (later changes go through a transfer). An opening balance can be entered here (it is
// posted as a reversal-and-repost entry, the same as the Opening Balance screen).
export function ContactFormPage({ config, contactId }: { config: ContactScreenConfig; contactId?: string }) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const prefix = config.messagePrefix;
  const text = (suffix: string) => translateMessage(`${prefix}.${suffix}` as MessageKey);
  const [values, setValues] = useState<ContactFormValues>(() => createEmptyContactForm(todayAsIsoDate()));
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [message, setMessage] = useState<string>();
  const [loadedContact, setLoadedContact] = useState<ContactDetailResponse | null>(null);

  const isEditing = contactId !== undefined;
  const contact = useApiQuery<ContactDetailResponse>(isEditing ? config.endpoints.byId(contactId) : "", { enabled: isEditing });
  const cities = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.cities));
  const stores = useApiQuery<StoreSummaryResponse[]>(ApiEndpoints.stores.listAccessibleStores, { enabled: config.kind === "staff" });
  const create = useApiMutation<SaveContactRequest, { id: string }>(config.endpoints.list);
  const update = useApiMutation<UpdateContactRequest>(isEditing ? config.endpoints.byId(contactId) : "", { method: "PUT" });
  const maySave = hasPermission(isEditing ? config.permissions.edit : config.permissions.add);

  // The loaded contact fills the form (adjusting state while rendering, not in an effect).
  if (contact.data && contact.data !== loadedContact) {
    setLoadedContact(contact.data);
    setValues(valuesFromContact(contact.data, todayAsIsoDate()));
  }

  function change<TField extends keyof ContactFormValues>(field: TField, value: ContactFormValues[TField]) {
    setValues((current) => ({ ...current, [field]: value }));
  }
  const errorText = (field: keyof ContactFormErrors) => (errors[field] ? text(errors[field]) : undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const today = todayAsIsoDate();
    const found = validateContactForm(values, config.kind, !isEditing, today);
    setErrors(found);
    setMessage(undefined);
    if (hasContactFormErrors(found)) return;
    const body = toSaveContactRequest(values, config.kind);
    const result = loadedContact ? await update.execute({ ...body, rowVersion: loadedContact.rowVersion }) : await create.execute(body);
    if (!result.ok) return setMessage(result.problem.message);
    showToast(text("toast.saved"), ToneNames.success);
    router.push(config.routes.viewContacts);
  }

  if (isEditing && contact.status === "loading") return <LoadingIndicator />;
  if (isEditing && contact.status === "error") return <FormResultNotice errorMessage={contact.problem?.message} />;

  const section = (title: string, children: ReactNode) => (
    <SectionCard title={title}>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </SectionCard>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <PageHeader
        title={isEditing ? text("form.editTitle") : translateMessage(config.titleMessageKeys.newContact as MessageKey)}
        subtitle={loadedContact ? `${text("field.code")}: ${loadedContact.code}` : text("form.subtitle")}
      />

      {section(
        text("section.identity"),
        <>
          <TextInputField label={text("field.name")} name={`${prefix}Name`} required value={values.name} onChange={(event) => change("name", event.target.value)} errorMessage={errorText("name")} maxLength={ContactFormLimits.nameMaximumLength} autoFocus />
          <TextInputField label={text("field.phone")} name={`${prefix}Phone`} required dir="ltr" value={values.phone} onChange={(event) => change("phone", event.target.value)} errorMessage={errorText("phone")} />
          <TextInputField label={text("field.email")} name={`${prefix}Email`} type="email" dir="ltr" value={values.email} onChange={(event) => change("email", event.target.value)} errorMessage={errorText("email")} />
          <DateField label={text("field.birthDate")} name={`${prefix}BirthDate`} value={values.birthDate} onValueChange={(date) => change("birthDate", date)} errorMessage={errorText("birthDate")} />
          <FormField label={text("field.city")} name={`${prefix}City`}>
            {(controlProps) => (
              <NativeSelect {...controlProps} value={values.cityId} onChange={(event) => change("cityId", event.target.value)}>
                <option value="">{translateMessage("masterData.none")}</option>
                {(cities.data ?? []).map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField label={text("field.status")} name={`${prefix}Status`}>
            {(controlProps) => (
              <NativeSelect {...controlProps} value={values.statusCode} onChange={(event) => change("statusCode", event.target.value)}>
                <option value={ContactStatusCodes.active}>{translateMessage("common.status.active")}</option>
                <option value={ContactStatusCodes.inactive}>{translateMessage("common.status.inactive")}</option>
              </NativeSelect>
            )}
          </FormField>
        </>,
      )}

      {config.kind === "staff" &&
        section(
          text("section.staff"),
          <>
            <TextInputField label={text("field.designation")} name="staffDesignation" value={values.designation} onChange={(event) => change("designation", event.target.value)} errorMessage={errorText("designation")} />
            <FormField label={text("field.store")} name="staffStore" isRequired={!isEditing} errorMessage={errorText("storeId")}>
              {(controlProps) => (
                <NativeSelect {...controlProps} value={values.storeId} disabled={isEditing} onChange={(event) => change("storeId", event.target.value)}>
                  <option value="">{translateMessage("masterData.choose")}</option>
                  {(stores.data ?? []).filter((store) => !store.isHeadOffice).map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <div className="flex items-center gap-2">
              <Checkbox id="staff-is-manager" checked={values.isManager} onCheckedChange={(next) => change("isManager", next === true)} />
              <Label htmlFor="staff-is-manager">{text("field.isManager")}</Label>
            </div>
          </>,
        )}

      {true &&
        section(
          text("section.account"),
          <>
            {config.kind === "vendor" && (
              <WholeRupeeAmountField label={text("field.creditLimit")} name="vendorCreditLimit" value={values.creditLimit} onValueChange={(amount) => change("creditLimit", amount)} errorMessage={errorText("creditLimit")} hint={text("field.creditLimitHint")} />
            )}
            <FormField label={text("field.openingSide")} name={`${prefix}OpeningSide`}>
              {(controlProps) => (
                <NativeSelect {...controlProps} value={values.openingBalanceSideCode} onChange={(event) => change("openingBalanceSideCode", event.target.value as ContactFormValues["openingBalanceSideCode"])}>
                  <option value={OpeningBalanceSideCodes.debit}>{text("openingSide.debit")}</option>
                  <option value={OpeningBalanceSideCodes.credit}>{text("openingSide.credit")}</option>
                </NativeSelect>
              )}
            </FormField>
            <WholeRupeeAmountField label={text("field.openingAmount")} name={`${prefix}OpeningAmount`} value={values.openingBalanceAmount} onValueChange={(amount) => change("openingBalanceAmount", amount)} />
            <DateField label={text("field.openingDate")} name={`${prefix}OpeningDate`} value={values.openingBalanceAsOfDate} onValueChange={(date) => change("openingBalanceAsOfDate", date)} errorMessage={errorText("openingBalanceAsOfDate")} />
          </>,
        )}

      <FormResultNotice errorMessage={message} />
      <div className="flex gap-2">
        {maySave && <SubmitButton label={translateMessage("masterData.action.save")} pendingLabel={translateMessage("masterData.action.saving")} isPending={create.isPending || update.isPending} />}
        <Button type="button" variant="outline" onClick={() => router.push(config.routes.viewContacts)}>
          {text("action.back")}
        </Button>
      </div>
    </form>
  );
}
