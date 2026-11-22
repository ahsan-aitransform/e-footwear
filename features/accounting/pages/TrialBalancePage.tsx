"use client";

import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { cn } from "@/lib/utils";
import { PrintButton, PrintedReportHeading } from "../components/PrintControls";
import { ReportStoreSelect } from "../components/ReportStoreSelect";
import { formatColumnAmount } from "../logic/balanceFormatting";
import { todayAsIsoDate } from "../logic/reportDates";
import { TrialBalanceRowKindCodes, type TrialBalanceResponse } from "../types/accountReportTypes";

type TrialBalanceFilters = { asOfDate: string; storeId: string; includeZeroBalances: boolean };

// Trial Balance (docx 8.3) and Detail Trial Balance (8.4; the docx spells it "Trail"). The totals of every account head as on a date, and with
// isDetailed every account under its head. Total debit must equal total credit because every journal entry balances; if they ever differ the
// screen says so loudly instead of hiding it. The totals add the head rows only, so an account is never counted twice.
export function TrialBalancePage({ isDetailed }: { isDetailed: boolean }) {
  const { translateMessage } = useTranslation();
  const [asOfDate, setAsOfDate] = useState(todayAsIsoDate);
  const [storeId, setStoreId] = useState("");
  const [includeZeroBalances, setIncludeZeroBalances] = useState(false);
  const [submitted, setSubmitted] = useState<TrialBalanceFilters | null>(null);
  const [message, setMessage] = useState<string>();

  const report = useApiQuery<TrialBalanceResponse>(
    isDetailed ? ApiEndpoints.accountReports.detailTrialBalance : ApiEndpoints.accountReports.trialBalance,
    { query: submitted ?? {}, enabled: submitted !== null },
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (!isValidIsoDate(asOfDate)) return setMessage(translateMessage("fields.invalidDate"));
    setSubmitted({ asOfDate, storeId, includeZeroBalances });
  }

  const printPermission = isDetailed ? PermissionCodes.REPORTS.DETAIL_TRIAL_BALANCE.PRINT : PermissionCodes.REPORTS.TRIAL_BALANCE.PRINT;
  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage(isDetailed ? "accounting.reports.trial.detailTitle" : "accounting.reports.trial.title")}
        subtitle={translateMessage(isDetailed ? "accounting.reports.trial.detailSubtitle" : "accounting.reports.trial.subtitle")}
      />
      <div className="print:hidden">
        <SectionCard>
          <form onSubmit={handleSubmit} className="grid items-end gap-4 sm:grid-cols-4">
            <DateField label={translateMessage("accounting.reports.trial.asOf")} name="trial-as-of" value={asOfDate} onValueChange={setAsOfDate} isRequired />
            <ReportStoreSelect name="trial-store" storeId={storeId} onStoreIdChange={setStoreId} />
            <div className="flex items-center gap-2 pb-1">
              <Checkbox id="trial-include-zero" checked={includeZeroBalances} onCheckedChange={(checked) => setIncludeZeroBalances(checked === true)} />
              <Label htmlFor="trial-include-zero">{translateMessage("accounting.reports.trial.includeZero")}</Label>
            </div>
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
            <PermissionGate requirement={requireAnyPermission(printPermission)}>
              <PrintButton />
            </PermissionGate>
          </div>
          <PrintedReportHeading title={translateMessage("accounting.reports.trial.printTitle", { date: report.data.asOfDate })} />
          <InlineNotice tone={report.data.isBalanced ? ToneNames.success : ToneNames.danger}>
            {translateMessage(report.data.isBalanced ? "accounting.reports.trial.balanced" : "accounting.reports.trial.notBalanced")}
          </InlineNotice>
          {report.data.rows.length === 0 ? (
            <EmptyState title={translateMessage("accounting.common.noRows")} text={translateMessage("accounting.common.noRowsText")} />
          ) : (
            <SectionCard isPadded={false}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translateMessage("accounting.reports.trial.column.head")}</TableHead>
                    <TableHead className="text-end">{translateMessage("accounting.reports.trial.column.totalDebit")}</TableHead>
                    <TableHead className="text-end">{translateMessage("accounting.reports.trial.column.totalCredit")}</TableHead>
                    <TableHead className="text-end">{translateMessage("accounting.reports.trial.column.balanceDebit")}</TableHead>
                    <TableHead className="text-end">{translateMessage("accounting.reports.trial.column.balanceCredit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.data.rows.map((row) => {
                    const isHead = row.rowKindCode === TrialBalanceRowKindCodes.group;
                    return (
                      <TableRow key={`${row.rowKindCode}-${row.accountId ?? row.groupCode}`} className={cn(isHead && "bg-muted/50 font-semibold")}>
                        <TableCell className={cn(!isHead && "ps-8")}>
                          <span dir="ltr">{isHead ? row.groupCode : row.accountCode}</span> {isHead ? row.groupTitle : row.accountTitle}
                        </TableCell>
                        <TableCell className="text-end">{formatColumnAmount(row.totalDebitAmount)}</TableCell>
                        <TableCell className="text-end">{formatColumnAmount(row.totalCreditAmount)}</TableCell>
                        <TableCell className="text-end">{formatColumnAmount(row.balanceDebitAmount)}</TableCell>
                        <TableCell className="text-end">{formatColumnAmount(row.balanceCreditAmount)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>{translateMessage("accounting.common.totals")}</TableCell>
                    <TableCell className="text-end" data-testid="trial-total-debit">{formatColumnAmount(report.data.totalDebitAmount)}</TableCell>
                    <TableCell className="text-end" data-testid="trial-total-credit">{formatColumnAmount(report.data.totalCreditAmount)}</TableCell>
                    <TableCell className="text-end">{formatColumnAmount(report.data.totalBalanceDebitAmount)}</TableCell>
                    <TableCell className="text-end">{formatColumnAmount(report.data.totalBalanceCreditAmount)}</TableCell>
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
