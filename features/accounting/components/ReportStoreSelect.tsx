"use client";

import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAccessibleStores } from "../hooks/useAccessibleStores";

// The store filter of a report. The empty value means "all stores"; it is offered only to people who may see every store
// (the server answers a store they may not use with 403, and limits "all" to their stores anyway).
export function ReportStoreSelect({ storeId, onStoreIdChange, name }: { storeId: string; onStoreIdChange: (storeId: string) => void; name: string }) {
  const { translateMessage } = useTranslation();
  const { stores, mayChooseAllStores } = useAccessibleStores();
  return (
    <FormField label={translateMessage("accounting.common.store")} name={name}>
      {(controlProps) => (
        <NativeSelect {...controlProps} value={storeId} onChange={(event) => onStoreIdChange(event.target.value)}>
          {mayChooseAllStores && <option value="">{translateMessage("accounting.common.allStores")}</option>}
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </NativeSelect>
      )}
    </FormField>
  );
}
