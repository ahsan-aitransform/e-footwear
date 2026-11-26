"use client";

import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import type { PayrollSheetLineResponse, SalaryPaymentResponse } from "../types/payrollTypes";

// The payments recorded on one salary line, oldest first. Payments are only ever added; this list is the history of what was paid and by whom.
export function LinePaymentsDialog({ line, onClose }: { line: PayrollSheetLineResponse; onClose: () => void }) {
  const { translateMessage } = useTranslation();
  const payments = useApiQuery<SalaryPaymentResponse[]>(ApiEndpoints.payroll.linePayments(line.lineId));

  const columns: DataGridColumn<SalaryPaymentResponse>[] = [
    { key: "paidOn", header: translateMessage("payroll.payments.column.paidOn"), render: (payment) => <span dir="ltr">{payment.paidOn}</span> },
    { key: "amount", header: translateMessage("payroll.payments.column.amount"), alignment: "end", render: (payment) => <span dir="ltr">{formatWholeRupees(payment.amount, { withSymbol: false })}</span> },
    { key: "method", header: translateMessage("payroll.payments.column.method"), render: (payment) => translateMessage(`payroll.method.${payment.methodCode}`) },
    { key: "reference", header: translateMessage("payroll.payments.column.reference"), isSecondary: true, render: (payment) => payment.reference ?? "" },
    { key: "paidBy", header: translateMessage("payroll.payments.column.paidBy"), isSecondary: true, render: (payment) => payment.paidByName ?? "" },
  ];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{translateMessage("payroll.payments.dialog.title", { name: line.employeeName })}</DialogTitle>
        </DialogHeader>
        <DataGridTable
          isClientSortDisabled
          rows={payments.data ?? []}
          columns={columns}
          getRowKey={(payment) => payment.id}
          caption={translateMessage("payroll.payments.dialog.title", { name: line.employeeName })}
          isLoading={payments.status === "loading"}
          errorMessage={payments.status === "error" ? payments.problem?.message : undefined}
          emptyTitle={translateMessage("payroll.payments.empty.title")}
          emptyText={translateMessage("payroll.payments.empty.text")}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {translateMessage("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
