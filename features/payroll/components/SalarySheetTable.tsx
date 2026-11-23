"use client";

import { Banknote, History, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { isLinePayable, summarizeSalaryLines } from "../logic/salarySheetCalculations";
import type { PayrollSheetLineResponse } from "../types/payrollTypes";
import { PayrollStatusBadge } from "./PayrollStatusBadge";

export type SalarySheetTableMode = "prepare" | "view";

const money = (amount: number) => formatWholeRupees(amount, { withSymbol: false });

// The grid of a salary sheet (docx 3.8 and 3.9): Store, Code, Name, Designation, Basic Pay, T Sale, Commission, Incentive, Deduction, Net Pay. The
// docx "Comm %" column is not shown: the commission of a month is a sum of approved commission entries with their own rates, not one percentage.
// While preparing, a line offers an Adjustment button; when viewing, a line offers Pay (approved lines with something outstanding) and its payments.
// The totals row adds the lines in whole rupees.
export function SalarySheetTable({
  lines,
  mode,
  onAdjust,
  onPay,
  onShowPayments,
  caption,
}: {
  lines: readonly PayrollSheetLineResponse[];
  mode: SalarySheetTableMode;
  onAdjust?: (line: PayrollSheetLineResponse) => void;
  onPay?: (line: PayrollSheetLineResponse) => void;
  onShowPayments?: (line: PayrollSheetLineResponse) => void;
  caption: string;
}) {
  const { translateMessage } = useTranslation();
  const totals = useMemo(() => summarizeSalaryLines(lines), [lines]);

  const columns = useMemo<DataGridColumn<PayrollSheetLineResponse>[]>(() => {
    const amountColumn = (key: string, messageKey: Parameters<typeof translateMessage>[0], read: (line: PayrollSheetLineResponse) => number, total: number): DataGridColumn<PayrollSheetLineResponse> => ({
      key,
      header: translateMessage(messageKey),
      alignment: "end",
      render: (line) => <span dir="ltr">{money(read(line))}</span>,
      totalCell: <span dir="ltr">{money(total)}</span>,
    });
    const columnList: DataGridColumn<PayrollSheetLineResponse>[] = [
      { key: "store", header: translateMessage("payroll.column.store"), isSecondary: true, render: (line) => line.storeName },
      { key: "code", header: translateMessage("payroll.column.code"), isSecondary: true, render: (line) => <span dir="ltr">{line.employeeCode}</span> },
      { key: "name", header: translateMessage("payroll.column.name"), render: (line) => line.employeeName },
      { key: "designation", header: translateMessage("payroll.column.designation"), isSecondary: true, render: (line) => line.designation ?? "" },
      amountColumn("baseSalary", "payroll.column.baseSalary", (line) => line.baseSalary, totals.baseSalary),
      amountColumn("totalSales", "payroll.column.totalSales", (line) => line.totalSales, totals.totalSales),
      amountColumn("commission", "payroll.column.commission", (line) => line.commissionAmount, totals.commissionAmount),
      amountColumn("incentive", "payroll.column.incentive", (line) => line.incentiveAmount, totals.incentiveAmount),
      amountColumn("deduction", "payroll.column.deduction", (line) => line.deductionAmount, totals.deductionAmount),
      amountColumn("netPay", "payroll.column.netPay", (line) => line.netPay, totals.netPay),
    ];
    if (mode === "view") {
      columnList.push(
        amountColumn("paid", "payroll.column.paid", (line) => line.paidAmount, totals.paidAmount),
        amountColumn("outstanding", "payroll.column.outstanding", (line) => line.outstandingAmount, totals.outstandingAmount),
        { key: "status", header: translateMessage("payroll.column.status"), render: (line) => <PayrollStatusBadge statusCode={line.statusCode} /> },
      );
    }
    const hasActions = mode === "prepare" ? onAdjust !== undefined : onPay !== undefined || onShowPayments !== undefined;
    if (hasActions) {
      columnList.push({
        key: "actions",
        header: translateMessage("payroll.column.actions"),
        alignment: "end",
        render: (line) => (
          <div className="flex flex-wrap justify-end gap-2 print:hidden">
            {mode === "prepare" && onAdjust && (
              <Button type="button" size="sm" variant="outline" onClick={() => onAdjust(line)}>
                <SlidersHorizontal />
                {translateMessage("payroll.action.addAdjustment")}
              </Button>
            )}
            {mode === "view" && onPay && isLinePayable(line) && (
              <Button type="button" size="sm" onClick={() => onPay(line)}>
                <Banknote />
                {translateMessage("payroll.action.pay")}
              </Button>
            )}
            {mode === "view" && onShowPayments && line.paidAmount > 0 && (
              <Button type="button" size="sm" variant="outline" onClick={() => onShowPayments(line)}>
                <History />
                {translateMessage("payroll.action.payments")}
              </Button>
            )}
          </div>
        ),
      });
    }
    return columnList;
  }, [translateMessage, totals, mode, onAdjust, onPay, onShowPayments]);

  return (
    <DataGridTable
      rows={lines}
      columns={columns}
      getRowKey={(line) => line.lineId}
      caption={caption}
      emptyTitle={translateMessage("payroll.sheet.noStaff")}
      showTotalsRow={lines.length > 0}
      totalsRowLabel={translateMessage("payroll.sheet.totals")}
    />
  );
}
