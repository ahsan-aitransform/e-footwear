"use client";

import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { StoreSummaryResponse } from "@/lib/types/store";

// "Applies to": the whole company (default) or one store, whose own values then override the company's.
export function StoreScopeSelector({
  stores,
  value,
  onChange,
}: {
  stores: readonly StoreSummaryResponse[];
  value: string;
  onChange: (storeId: string) => void;
}) {
  const { translateMessage } = useTranslation();
  return (
    <FormField
      label={translateMessage("settings.common.scopeLabel")}
      name="settings-scope"
      hint={translateMessage("settings.common.scopeHint")}
    >
      {(controlProps) => (
        <NativeSelect {...controlProps} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{translateMessage("settings.common.companyDefault")}</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.code} - {store.name}
            </option>
          ))}
        </NativeSelect>
      )}
    </FormField>
  );
}
