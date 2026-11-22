"use client";

import { useState } from "react";
import { DateFormatCodes, TimeFormatCodes } from "@/lib/constants/settingsCodes";
import { LanguageCodes } from "@/lib/constants/languageCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { RegionalPreferencesSettings } from "@/lib/types/settings";
import { nullableToText, textToNullable } from "../settingsFormValues";
import { TimeFormatMessageKeys } from "../settingsMessageKeys";
import { OptionalSelectField } from "./OptionalSelectField";
import { SettingsFormCard } from "./SettingsFormCard";
import type { SettingsFormProps } from "./SettingsSection";

// How dates and times are shown and the default language of the company. (Time zone and currency are in the company profile.)
export function RegionalPreferencesForm({
  values: initialValues,
  isStored,
  canEdit,
  isSaving,
  errorMessage,
  successMessage,
  fieldErrorMessages,
  onSave,
}: SettingsFormProps<RegionalPreferencesSettings>) {
  const { translateMessage } = useTranslation();
  const [dateFormat, setDateFormat] = useState(nullableToText(initialValues.dateFormat));
  const [timeFormat, setTimeFormat] = useState(nullableToText(initialValues.timeFormat));
  const [defaultLanguageCode, setDefaultLanguageCode] = useState(nullableToText(initialValues.defaultLanguageCode));
  const emptyOptionLabel = translateMessage("settings.common.notConfiguredOption");

  return (
    <SettingsFormCard
      title={translateMessage("settings.regional.title")}
      description={translateMessage("settings.regional.description")}
      isStored={isStored}
      canEdit={canEdit}
      isSaving={isSaving}
      errorMessage={errorMessage}
      successMessage={successMessage}
      onSubmit={() =>
        void onSave({
          dateFormat: textToNullable(dateFormat),
          timeFormat: textToNullable(timeFormat),
          defaultLanguageCode: textToNullable(defaultLanguageCode),
        })
      }
    >
      <OptionalSelectField
        label={translateMessage("settings.regional.dateFormat")}
        name="dateFormat"
        value={dateFormat}
        onChange={setDateFormat}
        emptyOptionLabel={emptyOptionLabel}
        options={DateFormatCodes.map((code) => ({ value: code, label: code }))}
        errorMessage={fieldErrorMessages.dateFormat}
      />
      <OptionalSelectField
        label={translateMessage("settings.regional.timeFormat")}
        name="timeFormat"
        value={timeFormat}
        onChange={setTimeFormat}
        emptyOptionLabel={emptyOptionLabel}
        options={TimeFormatCodes.map((code) => ({ value: code, label: translateMessage(TimeFormatMessageKeys[code]) }))}
        errorMessage={fieldErrorMessages.timeFormat}
      />
      <OptionalSelectField
        label={translateMessage("settings.regional.defaultLanguage")}
        name="defaultLanguageCode"
        value={defaultLanguageCode}
        onChange={setDefaultLanguageCode}
        emptyOptionLabel={emptyOptionLabel}
        hint={translateMessage("settings.regional.defaultLanguageHint")}
        options={[
          { value: LanguageCodes.english, label: translateMessage("settings.language.en") },
          { value: LanguageCodes.urdu, label: translateMessage("settings.language.ur") },
        ]}
        errorMessage={fieldErrorMessages.defaultLanguageCode}
      />
    </SettingsFormCard>
  );
}
