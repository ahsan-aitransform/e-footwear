"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { firstDayOfCurrentMonthAsIsoDate, todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import { StoreFilterSelect } from "@/features/payroll/components/StoreFilterSelect";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CommissionStaffFilterSelect } from "./CommissionStaffFilterSelect";

export const CommissionReportForms = { summary: "summary", detail: "detail" } as const;
export type CommissionReportForm = (typeof CommissionReportForms)[keyof typeof CommissionReportForms];

export type SubmittedCommissionReportFilters = { storeId: string; staffId: string; fromDate: string; toDate: string; form: CommissionReportForm };

// The filters of the commission reports (docx 8.14: store, salesman, from, to, and Summary or Detail). The report is asked for only when the person presses
// Show report, so a half-typed date never sends a request. The Summary or Detail choice is shown only by reports that have both.
export function CommissionReportFilters({
  idPrefix,
  hasFormChoice,
  onSubmit,
}: {
  idPrefix: string;
  hasFormChoice: boolean;
  onSubmit: (filters: SubmittedCommissionReportFilters) => void;
}) {
  const { translateMessage } = useTranslation();
  const [storeId, setStoreId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [fromDate, setFromDate] = useState(firstDayOfCurrentMonthAsIsoDate);
  const [toDate, setToDate] = useState(todayAsIsoDate);
  const [form, setForm] = useState<CommissionReportForm>(CommissionReportForms.summary);
  const [message, setMessage] = useState<string>();

  const formOptions: OptionSelectOption[] = [
    { value: CommissionReportForms.summary, label: translateMessage("commissions.report.form.summary") },
    { value: CommissionReportForms.detail, label: translateMessage("commissions.report.form.detail") },
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidIsoDate(fromDate) || !isValidIsoDate(toDate)) return setMessage(translateMessage("commissions.report.error.dates"));
    if (fromDate > toDate) return setMessage(translateMessage("commissions.report.error.dateOrder"));
    setMessage(undefined);
    onSubmit({ storeId, staffId, fromDate, toDate, form: hasFormChoice ? form : CommissionReportForms.summary });
  }

  return (
    <div className="print:hidden">
      <SectionCard>
        <form onSubmit={handleSubmit} className="grid items-end gap-4 sm:grid-cols-3 lg:grid-cols-6" noValidate>
          <StoreFilterSelect name={`${idPrefix}-store`} label={translateMessage("commissions.report.store")} allStoresLabel={translateMessage("commissions.report.allStores")} storeId={storeId} onStoreIdChange={setStoreId} />
          <CommissionStaffFilterSelect name={`${idPrefix}-staff`} label={translateMessage("commissions.report.staff")} allStaffLabel={translateMessage("commissions.report.allStaff")} staffId={staffId} onStaffIdChange={setStaffId} />
          <DateField label={translateMessage("commissions.report.fromDate")} name={`${idPrefix}-from`} isRequired value={fromDate} onValueChange={setFromDate} />
          <DateField label={translateMessage("commissions.report.toDate")} name={`${idPrefix}-to`} isRequired value={toDate} onValueChange={setToDate} />
          {hasFormChoice && (
            <FormField label={translateMessage("commissions.report.form")} name={`${idPrefix}-form`}>
              {(controlProps) => <OptionSelect {...controlProps} options={formOptions} value={form} onValueChange={(next) => setForm(next === CommissionReportForms.detail ? CommissionReportForms.detail : CommissionReportForms.summary)} />}
            </FormField>
          )}
          <Button type="submit">{translateMessage("commissions.report.show")}</Button>
        </form>
        <FormResultNotice errorMessage={message} />
      </SectionCard>
    </div>
  );
}
