"use client";

import { useMemo, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SearchableSelect, type SearchableSelectOption } from "@/components/forms/SearchableSelect";
import { Input } from "@/components/ui/input";
import { SEARCH_INPUT_DEBOUNCE_MILLISECONDS } from "@/lib/constants/paginationDefaults";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { formatAmountWithSide } from "../logic/balanceFormatting";
import { toTargetLookupQuery, type VoucherTargetChoice } from "../logic/voucherEntryLogic";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { VoucherTargetTypeCodes, type VoucherTargetOptionResponse, type VoucherTargetTypeCode } from "../types/voucherTypes";

const TYPE_OPTIONS: readonly { typeCode: VoucherTargetTypeCode; messageKey: MessageKey }[] = [
  { typeCode: VoucherTargetTypeCodes.account, messageKey: "accounting.voucher.targetType.account" },
  { typeCode: VoucherTargetTypeCodes.customer, messageKey: "accounting.voucher.targetType.customer" },
  { typeCode: VoucherTargetTypeCodes.vendor, messageKey: "accounting.voucher.targetType.vendor" },
  { typeCode: VoucherTargetTypeCodes.staff, messageKey: "accounting.voucher.targetType.staff" },
];

function optionValue(option: VoucherTargetOptionResponse): string {
  return option.accountId ?? option.partyId ?? option.code;
}

// One of the two boxes of a voucher ("To" / "From"): the Type dropdown (Account, Customer, Vendor, Staff), a search that asks the server
// (so a company with thousands of parties still finds one), the choice itself, and the current balance of what was chosen, derived from the
// journal. Changing the type clears the choice, because an account is not a customer.
export function VoucherTargetPicker({
  fieldName,
  boxLabel,
  typeLabel,
  targetsPath,
  choice,
  onChoiceChange,
  errorMessage,
}: {
  fieldName: string;
  boxLabel: string;
  typeLabel: string;
  // e.g. ApiEndpoints.vouchers.payment.targets: the lookup of the screen's own permission.
  targetsPath: string;
  choice: VoucherTargetChoice;
  onChoiceChange: (choice: VoucherTargetChoice) => void;
  errorMessage?: string;
}) {
  const { translateMessage } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText, SEARCH_INPUT_DEBOUNCE_MILLISECONDS);
  const lookup = toTargetLookupQuery(choice.typeCode);
  const targets = useApiQuery<VoucherTargetOptionResponse[]>(targetsPath, {
    query: { kindCode: lookup.kindCode, partyTypeCode: lookup.partyTypeCode, searchText: debouncedSearchText },
  });

  // The chosen option stays in the list even when a newer search no longer returns it.
  const selectOptions = useMemo<SearchableSelectOption<string>[]>(() => {
    const found = targets.data ?? [];
    const merged = choice.option !== null && !found.some((option) => optionValue(option) === optionValue(choice.option!)) ? [choice.option, ...found] : found;
    return merged.map((option) => ({ value: optionValue(option), label: `${option.code} ${option.title}`, description: option.typeTitle }));
  }, [targets.data, choice.option]);

  function handleTypeChange(typeCode: VoucherTargetTypeCode) {
    setSearchText("");
    onChoiceChange({ typeCode, option: null });
  }

  function handleOptionChange(value: string | null) {
    const option = value === null ? null : (targets.data ?? []).concat(choice.option ? [choice.option] : []).find((candidate) => optionValue(candidate) === value) ?? null;
    onChoiceChange({ typeCode: choice.typeCode, option });
  }

  const words = { debit: translateMessage("accounting.common.dr"), credit: translateMessage("accounting.common.cr") };
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={typeLabel} name={`${fieldName}-type`}>
          {(controlProps) => (
            <NativeSelect {...controlProps} value={choice.typeCode} onChange={(event) => handleTypeChange(event.target.value as VoucherTargetTypeCode)}>
              {TYPE_OPTIONS.map((typeOption) => (
                <option key={typeOption.typeCode} value={typeOption.typeCode}>
                  {translateMessage(typeOption.messageKey)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField label={translateMessage("accounting.voucher.target.search")} name={`${fieldName}-search`}>
          {(controlProps) => <Input {...controlProps} type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} />}
        </FormField>
      </div>
      <FormField label={boxLabel} name={fieldName} isRequired errorMessage={errorMessage}>
        {(controlProps) => (
          <SearchableSelect
            {...controlProps}
            options={selectOptions}
            value={choice.option === null ? null : optionValue(choice.option)}
            onValueChange={handleOptionChange}
            placeholder={targets.status === "success" && selectOptions.length === 0 ? translateMessage("accounting.voucher.target.nothingFound") : translateMessage("accounting.voucher.target.choose")}
            isClearable
          />
        )}
      </FormField>
      {choice.option !== null && (
        <p className="text-sm text-muted-foreground" data-testid={`${fieldName}-balance`}>
          {translateMessage("accounting.voucher.field.balance")}:{" "}
          <span dir="ltr" className="font-medium text-foreground">
            {formatAmountWithSide(choice.option.balanceAmount, choice.option.balanceSideCode, words)}
          </span>
        </p>
      )}
    </div>
  );
}
