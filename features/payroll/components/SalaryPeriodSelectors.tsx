"use client";

import { useAccessibleStores } from "@/features/accounting/hooks/useAccessibleStores";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { salaryMonthMessageKeys, salaryYearOptions, type SalaryMonth } from "../logic/salaryMonth";

// The month picker of the salary screens: a month and a year (a salary month has no day). Used on its own by the report filters.
export function SalaryMonthSelectors({
  salaryMonth,
  onSalaryMonthChange,
  idPrefix,
  monthLabel,
  yearLabel,
}: {
  salaryMonth: SalaryMonth;
  onSalaryMonthChange: (salaryMonth: SalaryMonth) => void;
  idPrefix: string;
  monthLabel?: string;
  yearLabel?: string;
}) {
  const { translateMessage } = useTranslation();
  const monthOptions: OptionSelectOption[] = salaryMonthMessageKeys.map((messageKey, index) => ({ value: String(index + 1), label: translateMessage(messageKey) }));
  // The chosen year is always offered, even when it is outside the usual range (a report on an old year).
  const years = Array.from(new Set([...salaryYearOptions(), salaryMonth.year])).sort((first, second) => first - second);
  const yearOptions: OptionSelectOption[] = years.map((year) => ({ value: String(year), label: String(year) }));
  return (
    <>
      <FormField label={monthLabel ?? translateMessage("payroll.filter.month")} name={`${idPrefix}-month`}>
        {(controlProps) => (
          <OptionSelect {...controlProps} options={monthOptions} value={String(salaryMonth.month)} onValueChange={(month) => month && onSalaryMonthChange({ ...salaryMonth, month: Number(month) })} />
        )}
      </FormField>
      <FormField label={yearLabel ?? translateMessage("payroll.filter.year")} name={`${idPrefix}-year`}>
        {(controlProps) => (
          <OptionSelect {...controlProps} options={yearOptions} value={String(salaryMonth.year)} onValueChange={(year) => year && onSalaryMonthChange({ ...salaryMonth, year: Number(year) })} />
        )}
      </FormField>
    </>
  );
}

// The store and month picker of the salary sheet screens. A salary sheet belongs to one store, so a store must be chosen.
export function SalaryPeriodSelectors({
  storeId,
  onStoreIdChange,
  salaryMonth,
  onSalaryMonthChange,
  idPrefix,
}: {
  storeId: string;
  onStoreIdChange: (storeId: string) => void;
  salaryMonth: SalaryMonth;
  onSalaryMonthChange: (salaryMonth: SalaryMonth) => void;
  idPrefix: string;
}) {
  const { translateMessage } = useTranslation();
  const { stores } = useAccessibleStores();
  const storeOptions: OptionSelectOption[] = stores.filter((store) => !store.isHeadOffice).map((store) => ({ value: store.id, label: store.name }));
  return (
    <div className="grid items-end gap-4 sm:grid-cols-3">
      <FormField label={translateMessage("payroll.filter.store")} name={`${idPrefix}-store`}>
        {(controlProps) => (
          <OptionSelect {...controlProps} options={storeOptions} value={storeId} onValueChange={onStoreIdChange} emptyOptionLabel={translateMessage("payroll.filter.chooseStore")} />
        )}
      </FormField>
      <SalaryMonthSelectors salaryMonth={salaryMonth} onSalaryMonthChange={onSalaryMonthChange} idPrefix={idPrefix} />
    </div>
  );
}
