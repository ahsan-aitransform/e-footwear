"use client";

import { useState } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrintButton, PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { StoreFilterSelect } from "../components/StoreFilterSelect";
import { formatSalaryMonth, salaryMonthFromIsoDate } from "../logic/salaryMonth";
import type { SalaryOutstandingReportResponse } from "../types/payrollTypes";

const money = (amount: number) => formatWholeRupees(amount, { withSymbol: false });

// Salary Outstanding Report (Part 22 additional report): approved salary that is not paid in full, per staff member and month, with totals over every line.
// A draft sheet is not owed yet and is not listed. The list loads as soon as the screen opens and again when the store filter changes.
export function SalaryOutstandingReportPage() {
  const { translateMessage } = useTranslation();
  const [storeId, setStoreId] = useState("");
  const report = useApiQuery<SalaryOutstandingReportResponse>(ApiEndpoints.payroll.salaryOutstandingReport, { query: { storeId } });
  const data = report.data;

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("payroll.salaryOutstandingReport.title")} subtitle={translateMessage("payroll.salaryOutstandingReport.subtitle")} />
      <div className="print:hidden">
        <SectionCard>
          <div className="grid items-end gap-4 sm:grid-cols-3">
            <StoreFilterSelect name="salary-outstanding-store" label={translateMessage("payroll.report.store")} allStoresLabel={translateMessage("payroll.report.allStores")} storeId={storeId} onStoreIdChange={setStoreId} />
          </div>
        </SectionCard>
      </div>

      {report.status === "loading" && <LoadingIndicator />}
      {report.status === "error" && <FormResultNotice errorMessage={report.problem?.message} />}
      {data && (
        <div className="space-y-4">
          <div className="flex justify-end print:hidden">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.REPORTS.SALARY_OUTSTANDING_REPORT.PRINT)}>
              <PrintButton label={translateMessage("payroll.action.print")} />
            </PermissionGate>
          </div>
          <PrintedReportHeading title={translateMessage("payroll.salaryOutstandingReport.printTitle")} />
          {data.isTruncated && <InlineNotice tone={ToneNames.warning}>{translateMessage("payroll.report.truncated")}</InlineNotice>}
          {data.rows.length === 0 ? (
            <EmptyState title={translateMessage("payroll.salaryOutstandingReport.noRows")} text={translateMessage("payroll.salaryOutstandingReport.noRowsText")} />
          ) : (
            <SectionCard isPadded={false}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translateMessage("payroll.payments.column.month")}</TableHead>
                    <TableHead>{translateMessage("payroll.column.store")}</TableHead>
                    <TableHead>{translateMessage("payroll.column.name")}</TableHead>
                    <TableHead className="text-end">{translateMessage("payroll.column.netPay")}</TableHead>
                    <TableHead className="text-end">{translateMessage("payroll.column.paid")}</TableHead>
                    <TableHead className="text-end">{translateMessage("payroll.column.outstanding")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => {
                    const rowMonth = salaryMonthFromIsoDate(row.periodMonth);
                    return (
                      <TableRow key={`${row.periodMonth}-${row.employeePartyId}-${row.storeId}`}>
                        <TableCell>{rowMonth ? formatSalaryMonth(rowMonth, translateMessage) : row.periodMonth}</TableCell>
                        <TableCell>{row.storeName}</TableCell>
                        <TableCell>{row.employeeName}</TableCell>
                        <TableCell className="text-end" dir="ltr">{money(row.netPay)}</TableCell>
                        <TableCell className="text-end" dir="ltr">{money(row.paidAmount)}</TableCell>
                        <TableCell className="text-end" dir="ltr">{money(row.outstandingAmount)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3}>
                      {translateMessage("payroll.sheet.totals")} ({translateMessage("payroll.report.totalLines")}: {data.lineCount})
                    </TableCell>
                    <TableCell className="text-end" dir="ltr">{money(data.totalNetPay)}</TableCell>
                    <TableCell className="text-end" dir="ltr">{money(data.totalPaid)}</TableCell>
                    <TableCell className="text-end" dir="ltr" data-testid="salary-outstanding-total">{money(data.totalOutstanding)}</TableCell>
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
