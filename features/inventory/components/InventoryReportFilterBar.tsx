"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ReportStoreSelect } from "@/features/accounting/components/ReportStoreSelect";
import { firstDayOfCurrentMonthAsIsoDate, isIsoDateRangeOrdered, todayAsIsoDate } from "@/features/accounting/logic/reportDates";

export type InventoryReportFilters = { storeId: string; fromDate: string; toDate: string };

// The filter form every inventory report shares (docx 8.20 to 8.31): Store, From, To and the Show button; a report adds its own fields as children. The dates are
// checked here so the person sees the problem next to the form. The form never prints (print:hidden).
export function InventoryReportFilterBar({
  onShow,
  extraFields,
  isStoreEnabled = true,
  actions,
}: {
  onShow: (filters: InventoryReportFilters) => void;
  extraFields?: ReactNode;
  isStoreEnabled?: boolean;
  actions?: ReactNode;
}) {
  const { translateMessage } = useTranslation();
  const [filters, setFilters] = useState<InventoryReportFilters>({ storeId: "", fromDate: firstDayOfCurrentMonthAsIsoDate(), toDate: todayAsIsoDate() });
  const [errorMessage, setErrorMessage] = useState<string>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(undefined);
    if (!isValidIsoDate(filters.fromDate) || !isValidIsoDate(filters.toDate)) return setErrorMessage(translateMessage("fields.invalidDate"));
    if (!isIsoDateRangeOrdered(filters.fromDate, filters.toDate)) return setErrorMessage(translateMessage("inventory.report.dateOrder"));
    onShow(filters);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 print:hidden">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isStoreEnabled && <ReportStoreSelect name="inventoryReportStore" storeId={filters.storeId} onStoreIdChange={(storeId) => setFilters((current) => ({ ...current, storeId }))} />}
        <DateField label={translateMessage("inventory.common.fromDate")} name="inventoryReportFrom" value={filters.fromDate} onValueChange={(fromDate) => setFilters((current) => ({ ...current, fromDate }))} />
        <DateField label={translateMessage("inventory.common.toDate")} name="inventoryReportTo" value={filters.toDate} onValueChange={(toDate) => setFilters((current) => ({ ...current, toDate }))} />
        {extraFields}
      </div>
      <FormResultNotice errorMessage={errorMessage} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit">{translateMessage("inventory.report.show")}</Button>
        {actions}
      </div>
    </form>
  );
}
