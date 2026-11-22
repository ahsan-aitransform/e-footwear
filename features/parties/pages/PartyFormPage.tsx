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
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import type { StoreSummaryResponse } from "@/lib/types/store";
import type { MasterListOptionResponse } from "@/features/masterData/types/masterListTypes";
import {
  createEmptyPartyForm,
  hasPartyFormErrors,
  PartyFormLimits,
  toSavePartyRequest,
  validatePartyForm,
  type PartyFormErrors,
  type PartyFormValues,
} from "../logic/partyFormValidation";
import {
  OpeningBalanceSideCodes,
  PartyStatusCodes,
  type PartyDetailResponse,
  type SavePartyRequest,
  type UpdatePartyRequest,
} from "../types/partyTypes";

function todayAsIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function valuesFromParty(party: PartyDetailResponse, todayIsoDate: string): PartyFormValues {
  return {
    name: party.name,
    nameUrdu: party.nameUrdu ?? "",
    fatherName: party.fatherName ?? "",
    cnic: party.cnic ?? "",
    cityId: party.cityId ?? "",
    primaryPhone: party.primaryPhone ?? "",
    secondaryPhone: party.secondaryPhone ?? "",
    email: party.email ?? "",
    address: party.address ?? "",
    notes: party.notes ?? "",
    isCustomer: party.isCustomer,
    isVendor: party.isVendor,
    isStaff: party.isStaff,
    creditLimit: party.creditLimit,
    statusCode: party.statusCode,
    designation: party.designation ?? "",
    isManager: party.isManager,
    staffStoreId: party.staffStoreId ?? "",
    openingBalanceSideCode: party.openingBalance?.sideCode ?? OpeningBalanceSideCodes.debit,
    openingBalanceAmount: party.openingBalance?.amount ?? null,
    openingBalanceAsOfDate: party.openingBalance?.asOfDate ?? todayIsoDate,
  };
}

function CheckboxRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(next) => onChange(next === true)} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

// New Party and Manage Party's edit page share this form (docx 3.1 / 3.2): customer, vendor and staff are one record with
// type flags. The party code is given by the server. Staff need a store; an opening balance can be entered here (it is
// posted as a reversal-and-repost entry, same as the Opening Balance screen).
export function PartyFormPage({ partyId }: { partyId?: string }) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const [values, setValues] = useState<PartyFormValues>(() => createEmptyPartyForm(todayAsIsoDate()));
  const [errors, setErrors] = useState<PartyFormErrors>({});
  const [message, setMessage] = useState<string>();
  const [loadedParty, setLoadedParty] = useState<PartyDetailResponse | null>(null);

  const isEditing = partyId !== undefined;
  const party = useApiQuery<PartyDetailResponse>(isEditing ? ApiEndpoints.parties.byId(partyId) : "", { enabled: isEditing });
  const cities = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.cities));
  const stores = useApiQuery<StoreSummaryResponse[]>(ApiEndpoints.stores.listAccessibleStores);
  const create = useApiMutation<SavePartyRequest, { id: string }>(ApiEndpoints.parties.list);
  const update = useApiMutation<UpdatePartyRequest>(isEditing ? ApiEndpoints.parties.byId(partyId) : "", { method: "PUT" });
  const maySave = hasPermission(isEditing ? PermissionCodes.PARTY.NEW_PARTY.EDIT : PermissionCodes.PARTY.NEW_PARTY.ADD);

  // The loaded party fills the form (adjusting state while rendering, not in an effect).
  if (party.data && party.data !== loadedParty) {
    setLoadedParty(party.data);
    setValues(valuesFromParty(party.data, todayAsIsoDate()));
  }

  function change<TField extends keyof PartyFormValues>(field: TField, value: PartyFormValues[TField]) {
    setValues((current) => ({ ...current, [field]: value }));
  }
  const errorText = (field: keyof PartyFormErrors) => (errors[field] ? translateMessage(errors[field]) : undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validatePartyForm(values);
    setErrors(found);
    setMessage(undefined);
    if (hasPartyFormErrors(found)) return;
    const body = toSavePartyRequest(values);
    const result = loadedParty ? await update.execute({ ...body, rowVersion: loadedParty.rowVersion }) : await create.execute(body);
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("parties.toast.saved"), ToneNames.success);
    router.push(ApplicationRoutes.manageParties);
  }

  if (isEditing && party.status === "loading") return <LoadingIndicator />;
  if (isEditing && party.status === "error") return <FormResultNotice errorMessage={party.problem?.message} />;

  const section = (title: string, children: ReactNode) => (
    <SectionCard title={title}>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </SectionCard>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <PageHeader
        title={translateMessage(isEditing ? "parties.form.editTitle" : "navigation.item.newParty")}
        subtitle={loadedParty ? `${translateMessage("parties.field.code")}: ${loadedParty.code}` : translateMessage("parties.form.subtitle")}
      />

      {section(
        translateMessage("parties.section.identity"),
        <>
          <TextInputField label={translateMessage("parties.field.name")} name="partyName" required value={values.name} onChange={(event) => change("name", event.target.value)} errorMessage={errorText("name")} maxLength={PartyFormLimits.nameMaximumLength} autoFocus />
          <TextInputField label={translateMessage("parties.field.nameUrdu")} name="partyNameUrdu" dir="rtl" value={values.nameUrdu} onChange={(event) => change("nameUrdu", event.target.value)} />
          <TextInputField label={translateMessage("parties.field.fatherName")} name="partyFatherName" value={values.fatherName} onChange={(event) => change("fatherName", event.target.value)} />
          <TextInputField label={translateMessage("parties.field.cnic")} name="partyCnic" dir="ltr" placeholder="00000-0000000-0" value={values.cnic} onChange={(event) => change("cnic", event.target.value)} errorMessage={errorText("cnic")} />
          <div className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">{translateMessage("parties.field.partyType")}</span>
            <div className="flex flex-wrap gap-6">
              <CheckboxRow id="party-is-customer" label={translateMessage("parties.type.customer")} checked={values.isCustomer} onChange={(checked) => change("isCustomer", checked)} />
              <CheckboxRow id="party-is-vendor" label={translateMessage("parties.type.vendor")} checked={values.isVendor} onChange={(checked) => change("isVendor", checked)} />
              <CheckboxRow id="party-is-staff" label={translateMessage("parties.type.staff")} checked={values.isStaff} onChange={(checked) => change("isStaff", checked)} />
            </div>
            {errors.partyType && <p role="alert" className="text-sm text-destructive">{translateMessage(errors.partyType)}</p>}
          </div>
          <FormField label={translateMessage("parties.field.status")} name="partyStatus">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={values.statusCode} onChange={(event) => change("statusCode", event.target.value)}>
                <option value={PartyStatusCodes.active}>{translateMessage("common.status.active")}</option>
                <option value={PartyStatusCodes.inactive}>{translateMessage("common.status.inactive")}</option>
              </NativeSelect>
            )}
          </FormField>
        </>,
      )}

      {section(
        translateMessage("parties.section.contact"),
        <>
          <TextInputField label={translateMessage("parties.field.primaryPhone")} name="partyPrimaryPhone" dir="ltr" value={values.primaryPhone} onChange={(event) => change("primaryPhone", event.target.value)} errorMessage={errorText("primaryPhone")} />
          <TextInputField label={translateMessage("parties.field.secondaryPhone")} name="partySecondaryPhone" dir="ltr" value={values.secondaryPhone} onChange={(event) => change("secondaryPhone", event.target.value)} errorMessage={errorText("secondaryPhone")} />
          <TextInputField label={translateMessage("parties.field.email")} name="partyEmail" type="email" dir="ltr" value={values.email} onChange={(event) => change("email", event.target.value)} errorMessage={errorText("email")} />
          <FormField label={translateMessage("parties.field.city")} name="partyCity">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={values.cityId} onChange={(event) => change("cityId", event.target.value)}>
                <option value="">{translateMessage("masterData.none")}</option>
                {(cities.data ?? []).map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <div className="md:col-span-2">
            <TextInputField label={translateMessage("parties.field.address")} name="partyAddress" value={values.address} onChange={(event) => change("address", event.target.value)} errorMessage={errorText("address")} />
          </div>
          <div className="md:col-span-2">
            <TextInputField label={translateMessage("parties.field.notes")} name="partyNotes" value={values.notes} onChange={(event) => change("notes", event.target.value)} errorMessage={errorText("notes")} />
          </div>
        </>,
      )}

      {(values.isCustomer || values.isVendor) &&
        section(
          translateMessage("parties.section.account"),
          <>
            {values.isCustomer && (
              <WholeRupeeAmountField label={translateMessage("parties.field.creditLimit")} name="partyCreditLimit" value={values.creditLimit} onValueChange={(amount) => change("creditLimit", amount)} errorMessage={errorText("creditLimit")} hint={translateMessage("parties.field.creditLimitHint")} />
            )}
            <FormField label={translateMessage("parties.field.openingSide")} name="partyOpeningSide">
              {(controlProps) => (
                <NativeSelect {...controlProps} value={values.openingBalanceSideCode} onChange={(event) => change("openingBalanceSideCode", event.target.value as PartyFormValues["openingBalanceSideCode"])}>
                  <option value={OpeningBalanceSideCodes.debit}>{translateMessage("parties.openingSide.debit")}</option>
                  <option value={OpeningBalanceSideCodes.credit}>{translateMessage("parties.openingSide.credit")}</option>
                </NativeSelect>
              )}
            </FormField>
            <WholeRupeeAmountField label={translateMessage("parties.field.openingAmount")} name="partyOpeningAmount" value={values.openingBalanceAmount} onValueChange={(amount) => change("openingBalanceAmount", amount)} />
            <DateField label={translateMessage("parties.field.openingDate")} name="partyOpeningDate" value={values.openingBalanceAsOfDate} onValueChange={(date) => change("openingBalanceAsOfDate", date)} errorMessage={errorText("openingBalanceAsOfDate")} />
          </>,
        )}

      {values.isStaff &&
        section(
          translateMessage("parties.section.staff"),
          <>
            <TextInputField label={translateMessage("parties.field.designation")} name="partyDesignation" value={values.designation} onChange={(event) => change("designation", event.target.value)} errorMessage={errorText("designation")} />
            <FormField label={translateMessage("parties.field.staffStore")} name="partyStaffStore" isRequired errorMessage={errorText("staffStoreId")}>
              {(controlProps) => (
                <NativeSelect {...controlProps} value={values.staffStoreId} onChange={(event) => change("staffStoreId", event.target.value)}>
                  <option value="">{translateMessage("masterData.choose")}</option>
                  {(stores.data ?? []).map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <CheckboxRow id="party-is-manager" label={translateMessage("parties.field.isManager")} checked={values.isManager} onChange={(checked) => change("isManager", checked)} />
          </>,
        )}

      <FormResultNotice errorMessage={message} />
      <div className="flex gap-2">
        {maySave && <SubmitButton label={translateMessage("masterData.action.save")} pendingLabel={translateMessage("masterData.action.saving")} isPending={create.isPending || update.isPending} />}
        <Button type="button" variant="outline" onClick={() => router.push(ApplicationRoutes.manageParties)}>
          {translateMessage("parties.action.back")}
        </Button>
      </div>
    </form>
  );
}
