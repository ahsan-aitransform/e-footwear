"use client";

import type { SearchableSelectOption } from "@/components/forms/SearchableSelect";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { useTranslation } from "@/lib/i18n/useTranslation";

// SearchableSelect for several choices: the shadcn Combobox with a chip per chosen item. Put it inside a FormField to get a label.
export function SearchableMultiSelect<TValue extends string>({
  options,
  values,
  onValuesChange,
  placeholder,
  ...controlProps
}: Readonly<{
  id?: string;
  name?: string;
  options: readonly SearchableSelectOption<TValue>[];
  values: readonly TValue[];
  onValuesChange: (values: TValue[]) => void;
  placeholder?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
}>) {
  const { translateMessage } = useTranslation();
  const anchor = useComboboxAnchor();
  const labelOf = (value: TValue) => options.find((option) => option.value === value)?.label ?? "";

  return (
    <Combobox multiple items={options.map((option) => option.value)} value={[...values]} onValueChange={(next: TValue[]) => onValuesChange(next)} itemToStringLabel={labelOf}>
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(chosen: TValue[]) => (
            <>
              {chosen.map((value) => (
                <ComboboxChip key={value}>{labelOf(value)}</ComboboxChip>
              ))}
              <ComboboxChipsInput {...controlProps} placeholder={chosen.length === 0 ? (placeholder ?? translateMessage("searchableSelect.placeholder")) : ""} />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>{translateMessage("searchableSelect.noResults")}</ComboboxEmpty>
        <ComboboxList>
          {(value: TValue) => (
            <ComboboxItem key={value} value={value}>
              {labelOf(value)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
