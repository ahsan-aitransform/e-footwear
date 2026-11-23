"use client";

import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrintButton, PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { PayrollStatusBadge } from "../components/PayrollStatusBadge";
import { SalaryMonthSelectors } from "../components/SalaryPeriodSelectors";
import { StoreFilterSelect } from "../components/StoreFilterSelect";
import { compareSalaryMonths, currentSalaryMonth, formatSalaryMonth, salaryMonthFromIsoDate, salaryMonthToFirstDayIsoDate, type SalaryMonth } from "../logic/salaryMonth";
import type { StaffSalaryReportResponse } from "../types/payrollTypes";

type SubmittedFilters = { storeId: string; fromMonth: string; toMonth: string };

const money = (amount: number) => formatWholeRupees(amount, { withSymbol: false });

// Staff Salary Report (Part 22 additional report): the salary lines of every staff member for a range of months, with totals over every matching line.
// A draft line counts as planned pay; only approved and paid lines are owed. A report cut at the row limit says so and still shows the right totals.
export function StaffSalaryReportPage() {
  const { translateMessage } = useTranslation();
  const [storeId, setStoreId] = useState("");
  const [fromMonth, setFromMonth] = useState<SalaryMonth>(() => currentSalaryMonth());
  const [toMonth, setToMonth] = useState<SalaryMonth>(() => currentSalaryMonth());
  const [submitted, setSubmitted] = useState<SubmittedFilters | null>(null);
  const [message, setMessage] = useState<string>();

  const report = useApiQuery<StaffSalaryReportResponse>(ApiEndpoints.payroll.staffSalaryReport, { query: submitted ?? {}, enabled: submitted !== null });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (compareSalaryMonths(fromMonth, toMonth) > 0) return setMessage(translateMessage("payroll.report.error.monthOrder"));
    setSubmitted({ storeId, fromMonth: salaryMonthToFirstDayIsoDate(fromMonth), toMonth: salaryMonthToFirstDayIsoDate(toMonth) });
  }

  const data = report.data;
  const printFromMonth = submitted ? salaryMonthFromIsoDate(submitted.fromMonth) : null;
  const printToMonth = submitted ? salaryMonthFromIsoDate(submitted.toMonth) : null;

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("payroll.staffSalaryReport.title")} subtitle={translateMessage("payroll.staffSalaryReport.subtitle")} />
      <div className="print:hidden">
        <SectionCard>
          <form onSubmit={handleSubmit} className="grid items-end gap-4 sm:grid-cols-5">
            <StoreFilterSelect name="staff-salary-report-store" label={translateMessage("payroll.report.store")} allStoresLabel={translateMessage("payroll.report.allStores")} storeId={storeId} onStoreIdChange={setStoreId} />
            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              <SalaryMonthSelectors idPrefix="staff-salary-from" salaryMonth={fromMonth} onSalaryMonthChange={setFromMonth} monthLabel={translateMessage("payroll.report.fromMonth")} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              <SalaryMonthSelectors idPrefix="staff-salary-to" salaryMonth={toMonth} onSalaryMonthChange={setToMonth} monthLabel={translateMessage("payroll.report.toMonth")} />
            </div>
            <Button type="submit" className="sm:col-span-5 sm:w-fit">
              {translateMessage("payroll.report.showReport")}
            </Button>
          </form>
        </SectionCard>
      </div>
      <FormResultNotice errorMessage={message} />

      {submitted !== null && report.status === "loading" && <LoadingIndicator />}
      {submitted !== null && report.status === "error" && <FormResultNotice errorMessage={report.problem?.message} />}
      {data && submitted && (
        <div className="space-y-4">
          <div className="flex justify-end print:hidden">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.REPORTS.STAFF_SALARY_REPORT.PRINT)}>
              <PrintButton label={translateMessage("payroll.action.print")} />
            </PermissionGate>
          </div>
          <PrintedReportHeading
            title={translateMessage("payroll.staffSalaryReport.printTitle", {
              from: printFromMonth ? formatSalaryMonth(printFromMonth, translateMessage) : submitted.fromMonth,
              to: printToMonth ? formatSalaryMonth(printToMonth, translateMessage) : submitted.toMonth,
            })}
          />
          {data.isTruncated && <InlineNotice tone={ToneNames.warning}>{translateMessage("payroll.report.truncated")}</InlineNotice>}
          {data.rows.length === 0 ? (
            <EmptyState title={translateMessage("payroll.report.noRows")} text={translateMessage("payroll.report.noRowsText")} />
          ) : (
            <SectionCard isPadded={false}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translateMessage("payroll.filter.month")}</TableHead>
                    <TableHead>{translateMessage("payroll.column.store")}</TableHead>
                    <TableHead>{translateMessage("payroll.column.code")}</TableHead>
                    <TableHead>{translateMessage("payroll.column.name")}</TableHead>
                    <TableHead className="text-end">{translateMessage("payroll.column.baseSalary")}</TableHead>
                    <TableHead className="text-end">{translateMessage("payroll.column.commission")}</TableHead>
                    <TableHead className="text-end">{translateMessage("payroll.column.incentive")}</TableHead>
                    <TableHead className="text-end">{translateMessage("payroll.column.deduction")}</TableHead>
                    <TableHead className="text-end">{translateMessage("payroll.column.netPay")}</TableHead>
                    <TableHead className="text-end">{translateMessage("payroll.column.paid")}</TableHead>
                    <TableHead className="text-end">{translateMessage("payroll.column.outstanding")}</TableHead>
                    <TableHead>{translateMessage("payroll.column.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => {
                    const rowMonth = salaryMonthFromIsoDate(row.periodMonth);
                    return (
                      <TableRow key={`${row.periodMonth}-${row.employeePartyId}-${row.storeId}`}>
                        <TableCell>{rowMonth ? formatSalaryMonth(rowMonth, translateMessage) : row.periodMonth}</TableCell>
                        <TableCell>{row.storeName}</TableCell>
                        <TableCell dir="ltr">{row.employeeCode}</TableCell>
                        <TableCell>{row.employeeName}</TableCell>
                        <TableCell className="text-end" dir="ltr">{money(row.baseSalary)}</TableCell>
                        <TableCell className="text-end" dir="ltr">{money(row.commissionAmount)}</TableCell>
                        <TableCell className="text-end" dir="ltr">{money(row.incentiveAmount)}</TableCell>
                        <TableCell className="text-end" dir="ltr">{money(row.deductionAmount)}</TableCell>
                        <TableCell className="text-end" dir="ltr">{money(row.netPay)}</TableCell>
                        <TableCell className="text-end" dir="ltr">{money(row.paidAmount)}</TableCell>
                        <TableCell className="text-end" dir="ltr">{money(row.outstandingAmount)}</TableCell>
                        <TableCell>
                          <PayrollStatusBadge statusCode={row.statusCode} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4}>
                      {translateMessage("payroll.sheet.totals")} ({translateMessage("payroll.report.totalLines")}: {data.lineCount})
                    </TableCell>
                    <TableCell className="text-end" dir="ltr">{money(data.totalBaseSalary)}</TableCell>
                    <TableCell className="text-end" dir="ltr">{money(data.totalCommission)}</TableCell>
                    <TableCell className="text-end" dir="ltr">{money(data.totalIncentive)}</TableCell>
                    <TableCell className="text-end" dir="ltr">{money(data.totalDeduction)}</TableCell>
                    <TableCell className="text-end" dir="ltr" data-testid="staff-salary-total-net-pay">{money(data.totalNetPay)}</TableCell>
                    <TableCell className="text-end" dir="ltr">{money(data.totalPaid)}</TableCell>
                    <TableCell className="text-end" dir="ltr" data-testid="staff-salary-total-outstanding">{money(data.totalOutstanding)}</TableCell>
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
