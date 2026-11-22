"use client";

import { useState } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { SectionCard } from "@/components/layout/SectionCard";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PriceBandBasisCodes, RoundingModeCodes } from "@/lib/constants/settingsCodes";
import { SettingsLimits } from "@/lib/constants/settingsLimits";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useIsOnline } from "@/lib/session/useSessionState";
import type { CompanyProfileResponse, UpdateCompanyProfileRequest } from "@/lib/types/settings";
import { nullableToText, textToNullable } from "../settingsFormValues";
import { getTimezoneOptions } from "../timezoneOptions";

// The legal and regional company profile. The business name and invoice text are on the Business Info tab of the Preference screen.
export function CompanyProfileForm({
  profile,
  canEdit,
  onSaved,
}: {
  profile: CompanyProfileResponse;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const { translateMessage } = useTranslation();
  const isOnline = useIsOnline();
  const mutation = useApiMutation<UpdateCompanyProfileRequest, CompanyProfileResponse>(ApiEndpoints.companySettings.companyProfile, {
    method: "PUT",
  });
  const [legalName, setLegalName] = useState(nullableToText(profile.legalName));
  const [ntn, setNtn] = useState(nullableToText(profile.ntn));
  const [strn, setStrn] = useState(nullableToText(profile.strn));
  const [timezone, setTimezone] = useState(profile.timezone);
  const [currencyCode, setCurrencyCode] = useState(profile.currencyCode);
  const [roundingMode, setRoundingMode] = useState(profile.roundingMode);
  const [priceBandBasis, setPriceBandBasis] = useState(profile.priceBandBasis);
  const [wasSaved, setWasSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWasSaved(false);
    const result = await mutation.execute({
      legalName: textToNullable(legalName),
      ntn: textToNullable(ntn),
      strn: textToNullable(strn),
      timezone,
      currencyCode: currencyCode.trim().toUpperCase(),
      roundingMode,
      priceBandBasis,
      expectedRowVersion: profile.rowVersion,
    });
    if (result.ok) {
      setWasSaved(true);
      onSaved();
    }
  }

  return (
    <SectionCard title={translateMessage("settings.companyProfile.formTitle")} description={translateMessage("settings.companyProfile.formDescription")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset disabled={!canEdit || mutation.isPending} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextInputField
              label={translateMessage("settings.companyProfile.legalName")}
              name="legalName"
              value={legalName}
              onChange={(event) => setLegalName(event.target.value)}
              maxLength={SettingsLimits.legalNameMaximumLength}
              errorMessage={mutation.fieldErrorMessages.legalName}
            />
          </div>
          <TextInputField
            label={translateMessage("settings.companyProfile.ntn")}
            name="ntn"
            dir="ltr"
            value={ntn}
            onChange={(event) => setNtn(event.target.value)}
            maxLength={SettingsLimits.taxNumberMaximumLength}
            errorMessage={mutation.fieldErrorMessages.ntn}
          />
          <TextInputField
            label={translateMessage("settings.companyProfile.strn")}
            name="strn"
            dir="ltr"
            value={strn}
            onChange={(event) => setStrn(event.target.value)}
            maxLength={SettingsLimits.taxNumberMaximumLength}
            errorMessage={mutation.fieldErrorMessages.strn}
          />
          <FormField label={translateMessage("settings.companyProfile.timezone")} name="timezone" errorMessage={mutation.fieldErrorMessages.timezone}>
            {(controlProps) => (
              <NativeSelect {...controlProps} value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                {getTimezoneOptions(profile.timezone).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <TextInputField
            label={translateMessage("settings.companyProfile.currency")}
            name="currencyCode"
            hint={translateMessage("settings.companyProfile.currencyHint")}
            dir="ltr"
            value={currencyCode}
            onChange={(event) => setCurrencyCode(event.target.value)}
            maxLength={3}
            errorMessage={mutation.fieldErrorMessages.currencyCode}
          />
          <FormField
            label={translateMessage("settings.companyProfile.roundingMode")}
            name="roundingMode"
            hint={translateMessage("settings.companyProfile.roundingHint")}
            errorMessage={mutation.fieldErrorMessages.roundingMode}
          >
            {(controlProps) => (
              <NativeSelect {...controlProps} value={roundingMode} onChange={(event) => setRoundingMode(event.target.value)}>
                {RoundingModeCodes.map((code) => (
                  <option key={code} value={code}>
                    {translateMessage(`settings.companyProfile.rounding.${code}`)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField
            label={translateMessage("settings.companyProfile.priceBandBasis")}
            name="priceBandBasis"
            errorMessage={mutation.fieldErrorMessages.priceBandBasis}
          >
            {(controlProps) => (
              <NativeSelect {...controlProps} value={priceBandBasis} onChange={(event) => setPriceBandBasis(event.target.value)}>
                {PriceBandBasisCodes.map((code) => (
                  <option key={code} value={code}>
                    {translateMessage(`settings.companyProfile.priceBand.${code}`)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
        </fieldset>
        <FormResultNotice
          errorMessage={mutation.problem?.message}
          successMessage={wasSaved ? translateMessage("settings.common.saved") : undefined}
        />
        {canEdit && (
          <SubmitButton
            label={translateMessage("common.save")}
            pendingLabel={translateMessage("settings.common.saving")}
            isPending={mutation.isPending}
            isDisabled={!isOnline}
          />
        )}
      </form>
    </SectionCard>
  );
}
