"use client";

import { EmptyState } from "@/components/feedback/EmptyState";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { SectionCard } from "@/components/layout/SectionCard";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { describeCommission } from "../logic/commissionFormatting";
import type { CommissionDetailReportResponse } from "../types/commissionTypes";
import { CommissionStatusBadge } from "./CommissionStatusBadge";

const money = (amount: number) => formatWholeRupees(amount, { withSymbol: false });

// One row per commission entry (an invoice line and the person it was credited to), with totals over every matching entry. The detail adds up to the summary.
export function CommissionDetailReportTable({ report }: { report: CommissionDetailReportResponse }) {
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
              <TableHead>{translateMessage("commissions.entries.column.staff")}</TableHead>
              <TableHead>{translateMessage("commissions.entries.column.date")}</TableHead>
              <TableHead>{translateMessage("commissions.entries.column.invoice")}</TableHead>
              <TableHead>{translateMessage("commissions.entries.column.type")}</TableHead>
              <TableHead>{translateMessage("commissions.entries.column.rate")}</TableHead>
              <TableHead className="text-end">{translateMessage("commissions.entries.column.base")}</TableHead>
              <TableHead className="text-end">{translateMessage("commissions.entries.column.commission")}</TableHead>
              <TableHead>{translateMessage("commissions.entries.column.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.staffName} ({entry.staffCode})</TableCell>
                <TableCell dir="ltr">{entry.saleDate}</TableCell>
                <TableCell dir="ltr">{entry.invoiceNumber}</TableCell>
                <TableCell>{translateMessage(`commissions.entries.type.${entry.entryTypeCode as "EARN" | "REVERSAL"}`)}</TableCell>
                <TableCell>{describeCommission(translateMessage, entry.calculationTypeCode, entry.rate, entry.fixedAmountPerPiece)}</TableCell>
                <TableCell className="text-end" dir="ltr">{money(entry.baseAmount)}</TableCell>
                <TableCell className="text-end" dir="ltr">{money(entry.commissionAmount)}</TableCell>
                <TableCell>
                  <CommissionStatusBadge statusCode={entry.statusCode} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5}>
                {translateMessage("commissions.report.totals")} ({translateMessage("commissions.report.entryCount", { count: report.entryCount })})
              </TableCell>
              <TableCell className="text-end" dir="ltr">{money(report.totalBaseAmount)}</TableCell>
              <TableCell className="text-end" dir="ltr" data-testid="commission-detail-total-commission">{money(report.totalCommissionAmount)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </SectionCard>
    </div>
  );
}
