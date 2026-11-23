"use client";

import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { useAccessibleStores } from "@/features/accounting/hooks/useAccessibleStores";

// The store filter of a list or report: the empty choice means "every store the person may see" (the server limits it to their stores), and each store the
// person may use can be chosen. Built on the shadcn Select.
export function StoreFilterSelect({
  storeId,
  onStoreIdChange,
  name,
  label,
  allStoresLabel,
}: {
  storeId: string;
  onStoreIdChange: (storeId: string) => void;
  name: string;
  label: string;
  allStoresLabel: string;
}) {
  const { stores } = useAccessibleStores();
  const options: OptionSelectOption[] = stores.filter((store) => !store.isHeadOffice).map((store) => ({ value: store.id, label: store.name }));
  return (
    <FormField label={label} name={name}>
      {(controlProps) => <OptionSelect {...controlProps} options={options} value={storeId} onValueChange={onStoreIdChange} emptyOptionLabel={allStoresLabel} />}
    </FormField>
  );
}
