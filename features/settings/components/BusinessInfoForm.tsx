"use client";

import { useState } from "react";
import { TextInputField } from "@/components/forms/TextInputField";
import { SettingsLimits } from "@/lib/constants/settingsLimits";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { BusinessInfoSettings } from "@/lib/types/settings";
import { nullableToText, textToNullable } from "../settingsFormValues";
import { SettingsFormCard } from "./SettingsFormCard";
import type { SettingsFormProps } from "./SettingsSection";
import { TextAreaField } from "./TextAreaField";

type BusinessInfoFormProps = SettingsFormProps<BusinessInfoSettings> & {
  // A store edits only its overrides: the business name belongs to the company, and an empty field inherits.
  isStoreScope: boolean;
  // What an empty store field falls back to, shown as its placeholder.
  inheritedValues?: BusinessInfoSettings;
};

// The "Business Info" tab of the docx Preference screen: names, contacts, addresses and the invoice text.
export function BusinessInfoForm({
  values: initialValues,
  isStored,
  canEdit,
  isSaving,
  errorMessage,
  successMessage,
  fieldErrorMessages,
  onSave,
  isStoreScope,
  inheritedValues,
}: BusinessInfoFormProps) {
  const { translateMessage } = useTranslation();
  const [businessName, setBusinessName] = useState(nullableToText(initialValues.businessName));
  const [barcodeName, setBarcodeName] = useState(nullableToText(initialValues.barcodeName));
  const [businessNameUrdu, setBusinessNameUrdu] = useState(nullableToText(initialValues.businessNameUrdu));
  const [phoneNumber, setPhoneNumber] = useState(nullableToText(initialValues.phoneNumber));
  const [mobileNumber, setMobileNumber] = useState(nullableToText(initialValues.mobileNumber));
  const [email, setEmail] = useState(nullableToText(initialValues.email));
  const [addressEnglish, setAddressEnglish] = useState(nullableToText(initialValues.addressEnglish));
  const [addressUrdu, setAddressUrdu] = useState(nullableToText(initialValues.addressUrdu));
  const [invoiceText, setInvoiceText] = useState(nullableToText(initialValues.invoiceText));

  const inheritHint = isStoreScope ? translateMessage("settings.common.inheritHint") : undefined;
  const placeholderOf = (inherited: string | null | undefined) => (isStoreScope ? (inherited ?? "") : undefined);

  function handleSubmit() {
    void onSave({
      businessName: isStoreScope ? null : textToNullable(businessName),
      barcodeName: textToNullable(barcodeName),
      businessNameUrdu: textToNullable(businessNameUrdu),
      phoneNumber: textToNullable(phoneNumber),
      mobileNumber: textToNullable(mobileNumber),
      email: textToNullable(email),
      addressEnglish: textToNullable(addressEnglish),
      addressUrdu: textToNullable(addressUrdu),
      invoiceText: textToNullable(invoiceText),
    });
  }

  return (
    <SettingsFormCard
      title={translateMessage("settings.businessInfo.title")}
      description={translateMessage(isStoreScope ? "settings.businessInfo.storeDescription" : "settings.businessInfo.description")}
      isStored={isStored}
      canEdit={canEdit}
      isSaving={isSaving}
      errorMessage={errorMessage}
      successMessage={successMessage}
      onSubmit={handleSubmit}
    >
      {!isStoreScope && (
        <div className="sm:col-span-2">
          <TextInputField
            label={translateMessage("settings.businessInfo.businessName")}
            name="businessName"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            maxLength={SettingsLimits.businessNameMaximumLength}
            errorMessage={fieldErrorMessages.businessName}
            required
          />
        </div>
      )}
      <TextInputField
        label={translateMessage("settings.businessInfo.barcodeName")}
        name="barcodeName"
        hint={inheritHint ?? translateMessage("settings.businessInfo.barcodeNameHint")}
        value={barcodeName}
        placeholder={placeholderOf(inheritedValues?.barcodeName)}
        onChange={(event) => setBarcodeName(event.target.value)}
        maxLength={SettingsLimits.barcodeNameMaximumLength}
        errorMessage={fieldErrorMessages.barcodeName}
      />
      <TextInputField
        label={translateMessage("settings.businessInfo.businessNameUrdu")}
        name="businessNameUrdu"
        dir="rtl"
        value={businessNameUrdu}
        placeholder={placeholderOf(inheritedValues?.businessNameUrdu)}
        onChange={(event) => setBusinessNameUrdu(event.target.value)}
        maxLength={SettingsLimits.businessNameMaximumLength}
        errorMessage={fieldErrorMessages.businessNameUrdu}
      />
      <TextInputField
        label={translateMessage("settings.businessInfo.phoneNumber")}
        name="phoneNumber"
        dir="ltr"
        value={phoneNumber}
        placeholder={placeholderOf(inheritedValues?.phoneNumber)}
        onChange={(event) => setPhoneNumber(event.target.value)}
        maxLength={SettingsLimits.phoneNumberMaximumLength}
        errorMessage={fieldErrorMessages.phoneNumber}
      />
      <TextInputField
        label={translateMessage("settings.businessInfo.mobileNumber")}
        name="mobileNumber"
        dir="ltr"
        value={mobileNumber}
        placeholder={placeholderOf(inheritedValues?.mobileNumber)}
        onChange={(event) => setMobileNumber(event.target.value)}
        maxLength={SettingsLimits.phoneNumberMaximumLength}
        errorMessage={fieldErrorMessages.mobileNumber}
      />
      <div className="sm:col-span-2">
        <TextInputField
          label={translateMessage("settings.businessInfo.email")}
          name="email"
          type="email"
          dir="ltr"
          value={email}
          placeholder={placeholderOf(inheritedValues?.email)}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={SettingsLimits.emailMaximumLength}
          errorMessage={fieldErrorMessages.email}
        />
      </div>
      <TextAreaField
        label={translateMessage("settings.businessInfo.addressEnglish")}
        name="addressEnglish"
        value={addressEnglish}
        placeholder={placeholderOf(inheritedValues?.addressEnglish)}
        onChange={(event) => setAddressEnglish(event.target.value)}
        maxLength={SettingsLimits.addressMaximumLength}
        errorMessage={fieldErrorMessages.addressEnglish}
      />
      <TextAreaField
        label={translateMessage("settings.businessInfo.addressUrdu")}
        name="addressUrdu"
        dir="rtl"
        value={addressUrdu}
        placeholder={placeholderOf(inheritedValues?.addressUrdu)}
        onChange={(event) => setAddressUrdu(event.target.value)}
        maxLength={SettingsLimits.addressMaximumLength}
        errorMessage={fieldErrorMessages.addressUrdu}
      />
      <div className="sm:col-span-2">
        <TextAreaField
          label={translateMessage("settings.businessInfo.invoiceText")}
          name="invoiceText"
          hint={translateMessage("settings.businessInfo.invoiceTextHint")}
          value={invoiceText}
          placeholder={placeholderOf(inheritedValues?.invoiceText)}
          onChange={(event) => setInvoiceText(event.target.value)}
          maxLength={SettingsLimits.invoiceTextMaximumLength}
          errorMessage={fieldErrorMessages.invoiceText}
        />
      </div>
    </SettingsFormCard>
  );
}
