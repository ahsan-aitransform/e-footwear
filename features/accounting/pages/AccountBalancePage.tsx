"use client";

import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { PrintButton, PrintedReportHeading } from "../components/PrintControls";
import { ReportStoreSelect } from "../components/ReportStoreSelect";
import { formatColumnAmount } from "../logic/balanceFormatting";
import { todayAsIsoDate } from "../logic/reportDates";
import type { AccountBalanceReportResponse, AccountBalanceTypeOptionResponse } from "../types/accountReportTypes";
import { BalanceSideCodes } from "../types/voucherTypes";

type BalanceFilters = { asOfDate: string; storeId: string; accountTypeFilter: string; amountTypeFilter: string };

// Account Balance (docx 8.2): the balances of all accounts, or of all customers, vendors or staff, of one type as on a date, in debit and credit
// columns. "Amount Type" limits the list to debit or credit balances (the new system also offers All). Balances are derived from journal lines.
export function AccountBalancePage() {
  const { translateMessage } = useTranslation();
  const typeOptions = useApiQuery<AccountBalanceTypeOptionResponse[]>(ApiEndpoints.accountReports.balanceTypes);
  const [asOfDate, setAsOfDate] = useState(todayAsIsoDate);
  const [storeId, setStoreId] = useState("");
  const [chosenTypeFilter, setChosenTypeFilter] = useState("");
  const [amountTypeFilter, setAmountTypeFilter] = useState<string>(BalanceSideCodes.all);
  const [submitted, setSubmitted] = useState<BalanceFilters | null>(null);
  const [message, setMessage] = useState<string>();

  const accountTypeFilter = chosenTypeFilter || typeOptions.data?.[0]?.filterCode || "";
  const report = useApiQuery<AccountBalanceReportResponse>(ApiEndpoints.accountReports.balances, {
    query: submitted ?? {},
    enabled: submitted !== null,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (!isValidIsoDate(asOfDate)) return setMessage(translateMessage("fields.invalidDate"));
    if (accountTypeFilter === "") return;
    setSubmitted({ asOfDate, storeId, accountTypeFilter, amountTypeFilter });
  }

  const typeTitle = typeOptions.data?.find((option) => option.filterCode === submitted?.accountTypeFilter)?.title ?? "";
  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("accounting.reports.balance.title")} subtitle={translateMessage("accounting.reports.balance.subtitle")} />
      <div className="print:hidden">
        <SectionCard>
          <form onSubmit={handleSubmit} className="grid items-end gap-4 sm:grid-cols-5">
            <DateField label={translateMessage("accounting.reports.balance.asOf")} name="balance-as-of" value={asOfDate} onValueChange={setAsOfDate} isRequired />
            <ReportStoreSelect name="balance-store" storeId={storeId} onStoreIdChange={setStoreId} />
            <FormField label={translateMessage("accounting.reports.balance.accountType")} name="balance-account-type">
              {(controlProps) => (
                <NativeSelect {...controlProps} value={accountTypeFilter} onChange={(event) => setChosenTypeFilter(event.target.value)}>
                  {(typeOptions.data ?? []).map((option) => (
                    <option key={option.filterCode} value={option.filterCode}>
                      {option.title}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField label={translateMessage("accounting.reports.balance.amountType")} name="balance-amount-type">
              {(controlProps) => (
                <NativeSelect {...controlProps} value={amountTypeFilter} onChange={(event) => setAmountTypeFilter(event.target.value)}>
                  <option value={BalanceSideCodes.all}>{translateMessage("accounting.reports.balance.amountType.all")}</option>
                  <option value={BalanceSideCodes.debit}>{translateMessage("accounting.reports.balance.amountType.debit")}</option>
                  <option value={BalanceSideCodes.credit}>{translateMessage("accounting.reports.balance.amountType.credit")}</option>
                </NativeSelect>
              )}
            </FormField>
            <Button type="submit">{translateMessage("accounting.common.showReport")}</Button>
          </form>
        </SectionCard>
      </div>
      <FormResultNotice errorMessage={message} />

      {submitted !== null && report.status === "loading" && <LoadingIndicator />}
      {submitted !== null && report.status === "error" && <FormResultNotice errorMessage={report.problem?.message} />}
      {report.data && (
        <div className="space-y-4">
          <div className="flex justify-end print:hidden">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.REPORTS.ACCOUNT_BALANCE.PRINT)}>
              <PrintButton />
            </PermissionGate>
          </div>
          <PrintedReportHeading title={`${translateMessage("accounting.reports.balance.printTitle", { date: report.data.asOfDate })} (${typeTitle})`} />
          {report.data.rows.length === 0 ? (
            <EmptyState title={translateMessage("accounting.common.noRows")} text={translateMessage("accounting.common.noRowsText")} />
          ) : (
            <SectionCard isPadded={false}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translateMessage("accounting.reports.balance.column.code")}</TableHead>
                    <TableHead>{translateMessage("accounting.reports.balance.column.title")}</TableHead>
                    <TableHead>{translateMessage("accounting.reports.balance.column.type")}</TableHead>
                    <TableHead className="text-end">{translateMessage("accounting.reports.balance.column.debit")}</TableHead>
                    <TableHead className="text-end">{translateMessage("accounting.reports.balance.column.credit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.data.rows.map((row) => (
                    <TableRow key={row.accountId ?? row.customerId ?? row.vendorId ?? row.staffId ?? row.code}>
                      <TableCell dir="ltr">{row.code}</TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{row.typeTitle}</TableCell>
                      <TableCell className="text-end">{formatColumnAmount(row.debitAmount)}</TableCell>
                      <TableCell className="text-end">{formatColumnAmount(row.creditAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3}>{translateMessage("accounting.common.totals")}</TableCell>
                    <TableCell className="text-end" data-testid="balance-total-debit">{formatColumnAmount(report.data.totalDebitAmount)}</TableCell>
                    <TableCell className="text-end" data-testid="balance-total-credit">{formatColumnAmount(report.data.totalCreditAmount)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
