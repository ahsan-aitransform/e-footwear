"use client";

import { EmptyState } from "@/components/feedback/EmptyState";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { SectionCard } from "@/components/layout/SectionCard";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import type { CommissionSummaryReportResponse } from "../types/commissionTypes";

const money = (amount: number) => formatWholeRupees(amount, { withSymbol: false });

// One row per staff member with what they earned, what returns took back and where the net stands. The totals row sums every matching person, not only the rows
// shown, so a report cut at the row limit still has the right totals. Both commission reports use it; the accrual report is the same figures read as a payment follow-up.
export function CommissionSummaryReportTable({ report, testIdPrefix }: { report: CommissionSummaryReportResponse; testIdPrefix: string }) {
  const { translateMessage } = useTranslation();
  if (report.rows.length === 0) {
    return <EmptyState title={translateMessage("commissions.report.noRows")} text={translateMessage("commissions.report.noRowsText")} />;
  }
  return (
    <div className="space-y-3">
      {report.isRowLimitReached && <InlineNotice tone={ToneNames.warning}>{translateMessage("commissions.report.truncated")}</InlineNotice>}
      <SectionCard isPadded={false}>
        <Table aria-label={translateMessage("commissions.report.title")}>
          <TableHeader>
            <TableRow>
              <TableHead>{translateMessage("commissions.report.column.code")}</TableHead>
              <TableHead>{translateMessage("commissions.report.column.name")}</TableHead>
              <TableHead className="text-end">{translateMessage("commissions.report.column.base")}</TableHead>
              <TableHead className="text-end">{translateMessage("commissions.report.column.earned")}</TableHead>
              <TableHead className="text-end">{translateMessage("commissions.report.column.reversed")}</TableHead>
              <TableHead className="text-end">{translateMessage("commissions.report.column.net")}</TableHead>
              <TableHead className="text-end">{translateMessage("commissions.report.column.pending")}</TableHead>
              <TableHead className="text-end">{translateMessage("commissions.report.column.approved")}</TableHead>
              <TableHead className="text-end">{translateMessage("commissions.report.column.paid")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => (
              <TableRow key={row.staffId}>
                <TableCell dir="ltr">{row.staffCode}</TableCell>
                <TableCell>{row.staffName}</TableCell>
                <TableCell className="text-end" dir="ltr">{money(row.baseAmount)}</TableCell>
                <TableCell className="text-end" dir="ltr">{money(row.earnedAmount)}</TableCell>
                <TableCell className="text-end" dir="ltr">{money(row.reversedAmount)}</TableCell>
                <TableCell className="text-end font-medium" dir="ltr">{money(row.netAmount)}</TableCell>
                <TableCell className="text-end" dir="ltr">{money(row.pendingAmount)}</TableCell>
                <TableCell className="text-end" dir="ltr">{money(row.approvedAmount)}</TableCell>
                <TableCell className="text-end" dir="ltr">{money(row.paidAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>
                {translateMessage("commissions.report.totals")} ({translateMessage("commissions.report.staffCount", { count: report.staffCount })})
              </TableCell>
              <TableCell className="text-end" dir="ltr">{money(report.totalBaseAmount)}</TableCell>
              <TableCell className="text-end" dir="ltr">{money(report.totalEarnedAmount)}</TableCell>
              <TableCell className="text-end" dir="ltr">{money(report.totalReversedAmount)}</TableCell>
              <TableCell className="text-end" dir="ltr" data-testid={`${testIdPrefix}-total-net`}>{money(report.totalNetAmount)}</TableCell>
              <TableCell className="text-end" dir="ltr">{money(report.totalPendingAmount)}</TableCell>
              <TableCell className="text-end" dir="ltr">{money(report.totalApprovedAmount)}</TableCell>
              <TableCell className="text-end" dir="ltr" data-testid={`${testIdPrefix}-total-paid`}>{money(report.totalPaidAmount)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </SectionCard>
    </div>
  );
}
