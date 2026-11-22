"use client";

import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { StatusBadge } from "@/components/feedback/StatusBadge";
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
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { PrintButton, PrintedReportHeading } from "../components/PrintControls";
import { ReportStoreSelect } from "../components/ReportStoreSelect";
import { firstDayOfCurrentMonthAsIsoDate, isIsoDateRangeOrdered, todayAsIsoDate } from "../logic/reportDates";
import { voucherTypeTitleMessageKeys } from "../logic/voucherTypeDefinitions";
import { VoucherTypeCodes, type VoucherReportResponse, type VoucherTypeCode } from "../types/voucherTypes";

type VoucherReportFilters = { voucherTypeCode: string; fromDate: string; toDate: string; storeId: string };

// Voucher Report (docx 6.6): every voucher of one type for a date range, printable. Voided vouchers are listed with their status but never add to
// the total. The server counts everything that matches, so a report cut at the row limit still shows the right figures and says it was cut.
export function VoucherReportPage() {
  const { translateMessage } = useTranslation();
  const [filters, setFilters] = useState<VoucherReportFilters>({
    voucherTypeCode: VoucherTypeCodes.payment,
    fromDate: firstDayOfCurrentMonthAsIsoDate(),
    toDate: todayAsIsoDate(),
    storeId: "",
  });
  const [submitted, setSubmitted] = useState<VoucherReportFilters | null>(null);
  const [message, setMessage] = useState<string>();

  const report = useApiQuery<VoucherReportResponse>(ApiEndpoints.vouchers.report, {
    query: submitted ?? {},
    enabled: submitted !== null,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (!isValidIsoDate(filters.fromDate) || !isValidIsoDate(filters.toDate)) return setMessage(translateMessage("fields.invalidDate"));
    if (!isIsoDateRangeOrdered(filters.fromDate, filters.toDate)) return setMessage(translateMessage("accounting.reports.error.dateOrder"));
    setSubmitted({ ...filters });
  }

  const typeTitle = submitted?.voucherTypeCode
    ? translateMessage(voucherTypeTitleMessageKeys[submitted.voucherTypeCode as VoucherTypeCode])
    : translateMessage("accounting.voucherReport.allTypes");

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("accounting.voucherReport.title")} subtitle={translateMessage("accounting.voucherReport.subtitle")} />
      <div className="print:hidden">
        <SectionCard>
          <form onSubmit={handleSubmit} className="grid items-end gap-4 sm:grid-cols-5">
            <FormField label={translateMessage("accounting.voucherReport.type")} name="voucher-report-type">
              {(controlProps) => (
                <NativeSelect {...controlProps} value={filters.voucherTypeCode} onChange={(event) => setFilters((current) => ({ ...current, voucherTypeCode: event.target.value }))}>
                  <option value="">{translateMessage("accounting.voucherReport.allTypes")}</option>
                  {Object.values(VoucherTypeCodes).map((code) => (
                    <option key={code} value={code}>
                      {translateMessage(voucherTypeTitleMessageKeys[code])}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <DateField label={translateMessage("accounting.common.from")} name="voucher-report-from" value={filters.fromDate} onValueChange={(fromDate) => setFilters((current) => ({ ...current, fromDate }))} isRequired />
            <DateField label={translateMessage("accounting.common.to")} name="voucher-report-to" value={filters.toDate} onValueChange={(toDate) => setFilters((current) => ({ ...current, toDate }))} isRequired />
            <ReportStoreSelect name="voucher-report-store" storeId={filters.storeId} onStoreIdChange={(storeId) => setFilters((current) => ({ ...current, storeId }))} />
            <Button type="submit">{translateMessage("accounting.common.showReport")}</Button>
          </form>
        </SectionCard>
      </div>
      <FormResultNotice errorMessage={message} />

      {submitted !== null && report.status === "loading" && <LoadingIndicator />}
      {submitted !== null && report.status === "error" && <FormResultNotice errorMessage={report.problem?.message} />}
      {report.data && submitted && (
        <div className="space-y-4">
          <div className="flex justify-end print:hidden">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.VOUCHER.VOUCHER_REPORT.PRINT)}>
              <PrintButton />
            </PermissionGate>
          </div>
          <PrintedReportHeading title={translateMessage("accounting.voucherReport.printTitle", { type: typeTitle, from: submitted.fromDate, to: submitted.toDate })} />
          {report.data.isTruncated && <InlineNotice tone={ToneNames.warning}>{translateMessage("accounting.voucherReport.truncated")}</InlineNotice>}
          {report.data.rows.length === 0 ? (
            <EmptyState title={translateMessage("accounting.common.noRows")} text={translateMessage("accounting.common.noRowsText")} />
          ) : (
            <SectionCard isPadded={false}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translateMessage("accounting.voucher.column.number")}</TableHead>
                    <TableHead>{translateMessage("accounting.voucher.column.date")}</TableHead>
                    <TableHead>{translateMessage("accounting.voucher.column.type")}</TableHead>
                    <TableHead>{translateMessage("accounting.voucher.column.store")}</TableHead>
                    <TableHead>{translateMessage("accounting.voucher.column.debit")}</TableHead>
                    <TableHead>{translateMessage("accounting.voucher.column.credit")}</TableHead>
                    <TableHead>{translateMessage("accounting.voucher.column.description")}</TableHead>
                    <TableHead className="text-end">{translateMessage("accounting.voucher.column.amount")}</TableHead>
                    <TableHead>{translateMessage("accounting.voucher.column.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.data.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell dir="ltr">{row.voucherNumber}</TableCell>
                      <TableCell dir="ltr">{row.voucherDate}</TableCell>
                      <TableCell>{translateMessage(voucherTypeTitleMessageKeys[row.voucherTypeCode])}</TableCell>
                      <TableCell>{row.storeName}</TableCell>
                      <TableCell>{row.debitAccountTitle}</TableCell>
                      <TableCell>{row.creditAccountTitle}</TableCell>
                      <TableCell>{row.description ?? ""}</TableCell>
                      <TableCell className="text-end">{formatWholeRupees(row.amount)}</TableCell>
                      <TableCell>
                        <StatusBadge statusCode={row.statusCode} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={7}>{translateMessage("accounting.voucherReport.totalAmount")}</TableCell>
                    <TableCell className="text-end" data-testid="voucher-report-total">{formatWholeRupees(report.data.totalAmount)}</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7}>{translateMessage("accounting.voucherReport.postedCount")}</TableCell>
                    <TableCell className="text-end">{report.data.postedVoucherCount}</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7}>{translateMessage("accounting.voucherReport.voidCount")}</TableCell>
                    <TableCell className="text-end">{report.data.voidVoucherCount}</TableCell>
                    <TableCell />
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
