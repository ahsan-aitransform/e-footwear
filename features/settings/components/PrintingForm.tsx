"use client";

import { useState } from "react";
import { TextInputField } from "@/components/forms/TextInputField";
import { PrintFormatCodes } from "@/lib/constants/settingsCodes";
import { SettingsLimits } from "@/lib/constants/settingsLimits";
import { LanguageCodes } from "@/lib/constants/languageCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { PrintingSettings } from "@/lib/types/settings";
import { PrintFormatMessageKeys } from "../settingsMessageKeys";
import {
  booleanToSelectValue,
  nullableToText,
  numberToText,
  parseOptionalNumber,
  selectValueToBoolean,
  textToNullable,
} from "../settingsFormValues";
import { OptionalBooleanSelectField, OptionalSelectField } from "./OptionalSelectField";
import { SettingsFormCard } from "./SettingsFormCard";
import type { SettingsFormProps } from "./SettingsSection";

type PrintingFormProps = SettingsFormProps<PrintingSettings> & { isStoreScope: boolean };

// Printing (Part 7 and 11): print format and language, right-to-left printing, logo on documents, label size, receipt copies.
// At company level an empty choice means "not configured"; for a store it means "use the company value".
export function PrintingForm({
  values: initialValues,
  isStored,
  canEdit,
  isSaving,
  errorMessage,
  successMessage,
  fieldErrorMessages,
  onSave,
  isStoreScope,
}: PrintingFormProps) {
  const { translateMessage } = useTranslation();
  const [defaultPrintFormat, setDefaultPrintFormat] = useState(nullableToText(initialValues.defaultPrintFormat));
  const [printLanguageCode, setPrintLanguageCode] = useState(nullableToText(initialValues.printLanguageCode));
  const [printRightToLeft, setPrintRightToLeft] = useState(booleanToSelectValue(initialValues.printRightToLeft));
  const [printLogoOnDocuments, setPrintLogoOnDocuments] = useState(booleanToSelectValue(initialValues.printLogoOnDocuments));
  const [labelWidth, setLabelWidth] = useState(numberToText(initialValues.barcodeLabelWidthMillimetres));
  const [labelHeight, setLabelHeight] = useState(numberToText(initialValues.barcodeLabelHeightMillimetres));
  const [receiptCopies, setReceiptCopies] = useState(numberToText(initialValues.receiptCopies));
  const [numberErrorMessage, setNumberErrorMessage] = useState<string>();

  const emptyOptionLabel = translateMessage(isStoreScope ? "settings.common.useCompanyValue" : "settings.common.notConfiguredOption");

  function handleSubmit() {
    const width = parseOptionalNumber(labelWidth);
    const height = parseOptionalNumber(labelHeight);
    const copies = parseOptionalNumber(receiptCopies);
    if (!width.isValid || !height.isValid || !copies.isValid) {
      setNumberErrorMessage(translateMessage("settings.common.invalidNumber"));
      return;
    }
    setNumberErrorMessage(undefined);
    void onSave({
      defaultPrintFormat: textToNullable(defaultPrintFormat),
      printLanguageCode: textToNullable(printLanguageCode),
      printRightToLeft: selectValueToBoolean(printRightToLeft),
      printLogoOnDocuments: selectValueToBoolean(printLogoOnDocuments),
      barcodeLabelWidthMillimetres: width.value,
      barcodeLabelHeightMillimetres: height.value,
      receiptCopies: copies.value,
    });
  }

  return (
    <SettingsFormCard
      title={translateMessage("settings.printing.title")}
      description={translateMessage(isStoreScope ? "settings.printing.storeDescription" : "settings.printing.description")}
      isStored={isStored}
      canEdit={canEdit}
      isSaving={isSaving}
      errorMessage={numberErrorMessage ?? errorMessage}
      successMessage={successMessage}
      onSubmit={handleSubmit}
    >
      <OptionalSelectField
        label={translateMessage("settings.printing.defaultPrintFormat")}
        name="defaultPrintFormat"
        value={defaultPrintFormat}
        onChange={setDefaultPrintFormat}
        emptyOptionLabel={emptyOptionLabel}
        options={PrintFormatCodes.map((code) => ({ value: code, label: translateMessage(PrintFormatMessageKeys[code]) }))}
        errorMessage={fieldErrorMessages.defaultPrintFormat}
      />
      <OptionalSelectField
        label={translateMessage("settings.printing.printLanguage")}
        name="printLanguageCode"
        value={printLanguageCode}
        onChange={setPrintLanguageCode}
        emptyOptionLabel={emptyOptionLabel}
        options={[
          { value: LanguageCodes.english, label: translateMessage("settings.language.en") },
          { value: LanguageCodes.urdu, label: translateMessage("settings.language.ur") },
        ]}
        errorMessage={fieldErrorMessages.printLanguageCode}
      />
      <OptionalBooleanSelectField
        label={translateMessage("settings.printing.printRightToLeft")}
        name="printRightToLeft"
        value={printRightToLeft}
        onChange={setPrintRightToLeft}
        emptyOptionLabel={emptyOptionLabel}
      />
      <OptionalBooleanSelectField
        label={translateMessage("settings.printing.printLogo")}
        name="printLogoOnDocuments"
        value={printLogoOnDocuments}
        onChange={setPrintLogoOnDocuments}
        emptyOptionLabel={emptyOptionLabel}
      />
      <TextInputField
        label={translateMessage("settings.printing.labelWidth")}
        name="barcodeLabelWidthMillimetres"
        inputMode="numeric"
        dir="ltr"
        hint={translateMessage("settings.printing.labelSizeHint", {
          minimum: SettingsLimits.labelDimensionMinimumMillimetres,
          maximum: SettingsLimits.labelDimensionMaximumMillimetres,
        })}
        value={labelWidth}
        onChange={(event) => setLabelWidth(event.target.value)}
        errorMessage={fieldErrorMessages.barcodeLabelWidthMillimetres}
      />
      <TextInputField
        label={translateMessage("settings.printing.labelHeight")}
        name="barcodeLabelHeightMillimetres"
        inputMode="numeric"
        dir="ltr"
        value={labelHeight}
        onChange={(event) => setLabelHeight(event.target.value)}
        errorMessage={fieldErrorMessages.barcodeLabelHeightMillimetres}
      />
      <TextInputField
        label={translateMessage("settings.printing.receiptCopies")}
        name="receiptCopies"
        inputMode="numeric"
        dir="ltr"
        hint={translateMessage("settings.printing.receiptCopiesHint", {
          minimum: SettingsLimits.receiptCopiesMinimum,
          maximum: SettingsLimits.receiptCopiesMaximum,
        })}
        value={receiptCopies}
        onChange={(event) => setReceiptCopies(event.target.value)}
        errorMessage={fieldErrorMessages.receiptCopies}
      />
    </SettingsFormCard>
  );
}
