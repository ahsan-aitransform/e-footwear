"use client";

import { useState } from "react";
import { TextInputField } from "@/components/forms/TextInputField";
import { SettingsLimits } from "@/lib/constants/settingsLimits";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { InventoryPolicySettings, PromotionPolicySettings, TaxSettings } from "@/lib/types/settings";
import { booleanToSelectValue, numberToText, parseOptionalNumber, selectValueToBoolean } from "../settingsFormValues";
import { OptionalBooleanSelectField } from "./OptionalSelectField";
import { SettingsFormCard } from "./SettingsFormCard";
import type { SettingsFormProps } from "./SettingsSection";

// Tax switches. Which tax rules apply is a business decision the system does not make: these are only stored values.
export function TaxForm({
  values: initialValues,
  isStored,
  canEdit,
  isSaving,
  errorMessage,
  successMessage,
  fieldErrorMessages,
  onSave,
}: SettingsFormProps<TaxSettings>) {
  const { translateMessage } = useTranslation();
  const [isTaxEnabled, setIsTaxEnabled] = useState(booleanToSelectValue(initialValues.isTaxEnabled));
  const [rate, setRate] = useState(numberToText(initialValues.defaultTaxRatePercentage));
  const [numberErrorMessage, setNumberErrorMessage] = useState<string>();

  function handleSubmit() {
    const parsedRate = parseOptionalNumber(rate);
    if (!parsedRate.isValid) {
      setNumberErrorMessage(translateMessage("settings.common.invalidNumber"));
      return;
    }
    setNumberErrorMessage(undefined);
    void onSave({ isTaxEnabled: selectValueToBoolean(isTaxEnabled), defaultTaxRatePercentage: parsedRate.value });
  }

  return (
    <SettingsFormCard
      title={translateMessage("settings.tax.title")}
      description={translateMessage("settings.tax.description")}
      isStored={isStored}
      canEdit={canEdit}
      isSaving={isSaving}
      errorMessage={numberErrorMessage ?? errorMessage}
      successMessage={successMessage}
      note={translateMessage("settings.tax.note")}
      onSubmit={handleSubmit}
    >
      <OptionalBooleanSelectField
        label={translateMessage("settings.tax.isEnabled")}
        name="isTaxEnabled"
        value={isTaxEnabled}
        onChange={setIsTaxEnabled}
        emptyOptionLabel={translateMessage("settings.common.notConfiguredOption")}
        errorMessage={fieldErrorMessages.isTaxEnabled}
      />
      <TextInputField
        label={translateMessage("settings.tax.defaultRate")}
        name="defaultTaxRatePercentage"
        inputMode="decimal"
        dir="ltr"
        value={rate}
        onChange={(event) => setRate(event.target.value)}
        errorMessage={fieldErrorMessages.defaultTaxRatePercentage}
      />
    </SettingsFormCard>
  );
}

// Negative stock and backdated adjustments. Nothing is decided for the business: an unset value means "not configured".
export function InventoryPolicyForm({
  values: initialValues,
  isStored,
  canEdit,
  isSaving,
  errorMessage,
  successMessage,
  fieldErrorMessages,
  onSave,
}: SettingsFormProps<InventoryPolicySettings>) {
  const { translateMessage } = useTranslation();
  const [allowNegativeStock, setAllowNegativeStock] = useState(booleanToSelectValue(initialValues.allowNegativeStock));
  const [allowBackdated, setAllowBackdated] = useState(booleanToSelectValue(initialValues.allowBackdatedStockAdjustments));
  const [maximumDays, setMaximumDays] = useState(numberToText(initialValues.backdatedStockAdjustmentMaximumDays));
  const [numberErrorMessage, setNumberErrorMessage] = useState<string>();

  function handleSubmit() {
    const parsedDays = parseOptionalNumber(maximumDays);
    if (!parsedDays.isValid) {
      setNumberErrorMessage(translateMessage("settings.common.invalidNumber"));
      return;
    }
    setNumberErrorMessage(undefined);
    void onSave({
      allowNegativeStock: selectValueToBoolean(allowNegativeStock),
      allowBackdatedStockAdjustments: selectValueToBoolean(allowBackdated),
      backdatedStockAdjustmentMaximumDays: parsedDays.value,
    });
  }

  return (
    <SettingsFormCard
      title={translateMessage("settings.inventoryPolicy.title")}
      description={translateMessage("settings.inventoryPolicy.description")}
      isStored={isStored}
      canEdit={canEdit}
      isSaving={isSaving}
      errorMessage={numberErrorMessage ?? errorMessage}
      successMessage={successMessage}
      note={translateMessage("settings.inventoryPolicy.note")}
      onSubmit={handleSubmit}
    >
      <OptionalBooleanSelectField
        label={translateMessage("settings.inventoryPolicy.allowNegativeStock")}
        name="allowNegativeStock"
        value={allowNegativeStock}
        onChange={setAllowNegativeStock}
        emptyOptionLabel={translateMessage("settings.common.notConfiguredOption")}
        errorMessage={fieldErrorMessages.allowNegativeStock}
      />
      <OptionalBooleanSelectField
        label={translateMessage("settings.inventoryPolicy.allowBackdated")}
        name="allowBackdatedStockAdjustments"
        value={allowBackdated}
        onChange={setAllowBackdated}
        emptyOptionLabel={translateMessage("settings.common.notConfiguredOption")}
        errorMessage={fieldErrorMessages.allowBackdatedStockAdjustments}
      />
      <TextInputField
        label={translateMessage("settings.inventoryPolicy.maximumDays")}
        name="backdatedStockAdjustmentMaximumDays"
        inputMode="numeric"
        dir="ltr"
        hint={translateMessage("settings.inventoryPolicy.maximumDaysHint", { maximum: SettingsLimits.backdatedAdjustmentMaximumDaysLimit })}
        value={maximumDays}
        onChange={(event) => setMaximumDays(event.target.value)}
        errorMessage={fieldErrorMessages.backdatedStockAdjustmentMaximumDays}
      />
    </SettingsFormCard>
  );
}

// The highest manual discount, as a percentage. Stacking and priority of promotions are not settings: they are open business decisions.
export function PromotionPolicyForm({
  values: initialValues,
  isStored,
  canEdit,
  isSaving,
  errorMessage,
  successMessage,
  fieldErrorMessages,
  onSave,
}: SettingsFormProps<PromotionPolicySettings>) {
  const { translateMessage } = useTranslation();
  const [maximumDiscount, setMaximumDiscount] = useState(numberToText(initialValues.maximumManualDiscountPercentage));
  const [numberErrorMessage, setNumberErrorMessage] = useState<string>();

  function handleSubmit() {
    const parsed = parseOptionalNumber(maximumDiscount);
    if (!parsed.isValid) {
      setNumberErrorMessage(translateMessage("settings.common.invalidNumber"));
      return;
    }
    setNumberErrorMessage(undefined);
    void onSave({ maximumManualDiscountPercentage: parsed.value });
  }

  return (
    <SettingsFormCard
      title={translateMessage("settings.promotionPolicy.title")}
      description={translateMessage("settings.promotionPolicy.description")}
      isStored={isStored}
      canEdit={canEdit}
      isSaving={isSaving}
      errorMessage={numberErrorMessage ?? errorMessage}
      successMessage={successMessage}
      onSubmit={handleSubmit}
    >
      <TextInputField
        label={translateMessage("settings.promotionPolicy.maximumDiscount")}
        name="maximumManualDiscountPercentage"
        inputMode="decimal"
        dir="ltr"
        value={maximumDiscount}
        onChange={(event) => setMaximumDiscount(event.target.value)}
        errorMessage={fieldErrorMessages.maximumManualDiscountPercentage}
      />
    </SettingsFormCard>
  );
}
