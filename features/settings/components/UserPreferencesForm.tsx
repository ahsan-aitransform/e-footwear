"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { SectionCard } from "@/components/layout/SectionCard";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { isSupportedLanguageCode, LanguageCodes } from "@/lib/constants/languageCodes";
import { UserPreferenceThemeCodes } from "@/lib/constants/settingsCodes";
import { setLanguage } from "@/lib/i18n/languageStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useIsOnline } from "@/lib/session/useSessionState";
import { isThemePreference, setThemePreference } from "@/lib/theme/themeStore";
import type { SaveSettingsRequest, SettingsDocumentResponse, UserPreferencesSettings } from "@/lib/types/settings";
import type { StoreSummaryResponse } from "@/lib/types/store";
import { nullableToText, textToNullable } from "../settingsFormValues";

// A person's own language, theme and default store. Saved on the server (so they follow the person to another device) and applied
// to this device at once.
export function UserPreferencesForm({
  document,
  stores,
  onSaved,
}: {
  document: SettingsDocumentResponse<UserPreferencesSettings>;
  stores: readonly StoreSummaryResponse[];
  onSaved: () => void;
}) {
  const { translateMessage } = useTranslation();
  const isOnline = useIsOnline();
  const mutation = useApiMutation<SaveSettingsRequest<UserPreferencesSettings>, SettingsDocumentResponse<UserPreferencesSettings>>(
    ApiEndpoints.userPreferences.ownPreferences,
    { method: "PUT" },
  );
  const [languageCode, setLanguageCode] = useState(nullableToText(document.values.languageCode));
  const [themeCode, setThemeCode] = useState(nullableToText(document.values.themeCode));
  const [defaultStoreId, setDefaultStoreId] = useState(nullableToText(document.values.defaultStoreId));
  const [wasSaved, setWasSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWasSaved(false);
    const result = await mutation.execute({
      values: { languageCode: textToNullable(languageCode), themeCode: textToNullable(themeCode), defaultStoreId: textToNullable(defaultStoreId) },
      expectedRowVersion: document.rowVersion,
    });
    if (!result.ok) return;
    if (isSupportedLanguageCode(languageCode)) setLanguage(languageCode);
    if (isThemePreference(themeCode)) setThemePreference(themeCode);
    setWasSaved(true);
    onSaved();
  }

  const noChoice = translateMessage("settings.myPreferences.noChoice");
  return (
    <SectionCard title={translateMessage("settings.myPreferences.formTitle")} description={translateMessage("settings.myPreferences.formDescription")}>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <FormField label={translateMessage("common.language")} name="languageCode" errorMessage={mutation.fieldErrorMessages.languageCode}>
          {(controlProps) => (
            <NativeSelect {...controlProps} value={languageCode} onChange={(event) => setLanguageCode(event.target.value)}>
              <option value="">{noChoice}</option>
              <option value={LanguageCodes.english}>{translateMessage("settings.language.en")}</option>
              <option value={LanguageCodes.urdu}>{translateMessage("settings.language.ur")}</option>
            </NativeSelect>
          )}
        </FormField>
        <FormField label={translateMessage("common.theme")} name="themeCode" errorMessage={mutation.fieldErrorMessages.themeCode}>
          {(controlProps) => (
            <NativeSelect {...controlProps} value={themeCode} onChange={(event) => setThemeCode(event.target.value)}>
              <option value="">{noChoice}</option>
              {UserPreferenceThemeCodes.map((code) => (
                <option key={code} value={code}>
                  {translateMessage(`common.theme.${code}`)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <div className="sm:col-span-2">
          <FormField label={translateMessage("settings.myPreferences.defaultStore")} name="defaultStoreId" errorMessage={mutation.fieldErrorMessages.defaultStoreId}>
            {(controlProps) => (
              <NativeSelect {...controlProps} value={defaultStoreId} onChange={(event) => setDefaultStoreId(event.target.value)}>
                <option value="">{noChoice}</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.code} - {store.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
        </div>
        <div className="space-y-3 sm:col-span-2">
          <FormResultNotice errorMessage={mutation.problem?.message} successMessage={wasSaved ? translateMessage("settings.common.saved") : undefined} />
          <SubmitButton
            label={translateMessage("common.save")}
            pendingLabel={translateMessage("settings.common.saving")}
            isPending={mutation.isPending}
            isDisabled={!isOnline}
          />
        </div>
      </form>
    </SectionCard>
  );
}
