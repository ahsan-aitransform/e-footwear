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
import { QueryStringParameterNames } from "@/lib/constants/paginationDefaults";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { PrintButton, PrintedReportHeading } from "../components/PrintControls";
import { ReportStoreSelect } from "../components/ReportStoreSelect";
import { formatColumnAmount } from "../logic/balanceFormatting";
import { firstDayOfCurrentMonthAsIsoDate, isIsoDateRangeOrdered, todayAsIsoDate } from "../logic/reportDates";
import { voucherTypeTitleMessageKeys } from "../logic/voucherTypeDefinitions";
import type { GeneralJournalResponse } from "../types/accountReportTypes";
import { VoucherTypeCodes, type VoucherTypeCode } from "../types/voucherTypes";

const JOURNAL_PAGE_SIZE = 200;

type JournalFilters = { fromDate: string; toDate: string; storeId: string; typeCode: string };

// General Journal (docx 8.28): every line of every entry of the books for a period, with the store, the entry type, the voucher number and the
// debit and credit columns. Summary hides the descriptions, Detail shows them. The totals cover the whole selection (they are always equal:
// every entry balances), the page is only what fits on screen. Entries of other kinds (sales, purchases, opening balances) appear under their
// source name; the reversal of a voided voucher appears as VOUCHER_VOID with the voucher number.
export function GeneralJournalPage() {
  const { translateMessage } = useTranslation();
  const [filters, setFilters] = useState<JournalFilters>({ fromDate: firstDayOfCurrentMonthAsIsoDate(), toDate: todayAsIsoDate(), storeId: "", typeCode: "" });
  const [isDetailed, setIsDetailed] = useState(true);
  const [submitted, setSubmitted] = useState<JournalFilters | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [message, setMessage] = useState<string>();

  const journal = useApiQuery<GeneralJournalResponse>(ApiEndpoints.accountReports.generalJournal, {
    query: submitted
      ? { ...submitted, [QueryStringParameterNames.page]: pageNumber, [QueryStringParameterNames.pageSize]: JOURNAL_PAGE_SIZE }
      : {},
    enabled: submitted !== null,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (!isValidIsoDate(filters.fromDate) || !isValidIsoDate(filters.toDate)) return setMessage(translateMessage("fields.invalidDate"));
    if (!isIsoDateRangeOrdered(filters.fromDate, filters.toDate)) return setMessage(translateMessage("accounting.reports.error.dateOrder"));
    setPageNumber(1);
    setSubmitted({ ...filters });
  }

  const totalPages = journal.data ? Math.max(1, Math.ceil(journal.data.lines.totalCount / JOURNAL_PAGE_SIZE)) : 1;
  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("accounting.reports.journal.title")} subtitle={translateMessage("accounting.reports.journal.subtitle")} />
      <div className="print:hidden">
        <SectionCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid items-end gap-4 sm:grid-cols-4">
              <DateField label={translateMessage("accounting.common.from")} name="journal-from" value={filters.fromDate} onValueChange={(fromDate) => setFilters((current) => ({ ...current, fromDate }))} isRequired />
              <DateField label={translateMessage("accounting.common.to")} name="journal-to" value={filters.toDate} onValueChange={(toDate) => setFilters((current) => ({ ...current, toDate }))} isRequired />
              <ReportStoreSelect name="journal-store" storeId={filters.storeId} onStoreIdChange={(storeId) => setFilters((current) => ({ ...current, storeId }))} />
              <FormField label={translateMessage("accounting.reports.journal.entryType")} name="journal-type">
                {(controlProps) => (
                  <NativeSelect {...controlProps} value={filters.typeCode} onChange={(event) => setFilters((current) => ({ ...current, typeCode: event.target.value }))}>
                    <option value="">{translateMessage("accounting.reports.journal.allTypes")}</option>
                    {Object.values(VoucherTypeCodes).map((code) => (
                      <option key={code} value={code}>
                        {translateMessage(voucherTypeTitleMessageKeys[code as VoucherTypeCode])}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
            </div>
            <fieldset className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="journal-view" checked={!isDetailed} onChange={() => setIsDetailed(false)} />
                {translateMessage("accounting.reports.journal.viewSummary")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="journal-view" checked={isDetailed} onChange={() => setIsDetailed(true)} />
                {translateMessage("accounting.reports.journal.viewDetail")}
              </label>
            </fieldset>
            <Button type="submit">{translateMessage("accounting.common.showReport")}</Button>
          </form>
        </SectionCard>
      </div>
      <FormResultNotice errorMessage={message} />

      {submitted !== null && journal.status === "loading" && <LoadingIndicator />}
      {submitted !== null && journal.status === "error" && <FormResultNotice errorMessage={journal.problem?.message} />}
      {journal.data && (
        <div className="space-y-4">
          <div className="flex justify-end print:hidden">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.REPORTS.GENERAL_JOURNAL.PRINT)}>
              <PrintButton />
            </PermissionGate>
          </div>
          <PrintedReportHeading title={translateMessage("accounting.reports.journal.printTitle", { from: journal.data.fromDate, to: journal.data.toDate })} />
          {journal.data.lines.items.length === 0 ? (
            <EmptyState title={translateMessage("accounting.common.noRows")} text={translateMessage("accounting.common.noRowsText")} />
          ) : (
            <SectionCard isPadded={false}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translateMessage("accounting.reports.journal.column.date")}</TableHead>
                    <TableHead>{translateMessage("accounting.reports.journal.column.store")}</TableHead>
                    <TableHead>{translateMessage("accounting.reports.journal.column.type")}</TableHead>
                    <TableHead>{translateMessage("accounting.reports.journal.column.number")}</TableHead>
                    <TableHead>{translateMessage("accounting.reports.journal.column.code")}</TableHead>
                    <TableHead>{translateMessage("accounting.reports.journal.column.title")}</TableHead>
                    {isDetailed && <TableHead>{translateMessage("accounting.reports.journal.column.description")}</TableHead>}
                    <TableHead className="text-end">{translateMessage("accounting.reports.journal.column.debit")}</TableHead>
                    <TableHead className="text-end">{translateMessage("accounting.reports.journal.column.credit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journal.data.lines.items.map((line) => (
                    <TableRow key={`${line.entryId}-${line.lineNumber}`}>
                      <TableCell dir="ltr">{line.entryDate}</TableCell>
                      <TableCell>{line.storeName}</TableCell>
                      <TableCell>{line.typeCode}</TableCell>
                      <TableCell dir="ltr">{line.voucherNumber ?? ""}</TableCell>
                      <TableCell dir="ltr">{line.accountCode}</TableCell>
                      <TableCell>{line.contactName ? `${line.contactName} (${line.accountTitle})` : line.accountTitle}</TableCell>
                      {isDetailed && <TableCell>{line.description ?? ""}</TableCell>}
                      <TableCell className="text-end">{formatColumnAmount(line.debitAmount)}</TableCell>
                      <TableCell className="text-end">{formatColumnAmount(line.creditAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={isDetailed ? 7 : 6}>{translateMessage("accounting.common.totals")}</TableCell>
                    <TableCell className="text-end" data-testid="journal-total-debit">{formatColumnAmount(journal.data.totalDebitAmount)}</TableCell>
                    <TableCell className="text-end" data-testid="journal-total-credit">{formatColumnAmount(journal.data.totalCreditAmount)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 p-3 print:hidden">
                  <Button type="button" variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)}>
                    {translateMessage("accounting.common.previousPage")}
                  </Button>
                  <span className="text-sm">{translateMessage("accounting.common.pageOf", { page: pageNumber, total: totalPages })}</span>
                  <Button type="button" variant="outline" size="sm" disabled={pageNumber >= totalPages} onClick={() => setPageNumber(pageNumber + 1)}>
                    {translateMessage("accounting.common.nextPage")}
                  </Button>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
