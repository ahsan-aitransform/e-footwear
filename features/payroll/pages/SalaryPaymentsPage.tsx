"use client";

import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { DateField } from "@/components/forms/DateField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees, sumWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { StoreFilterSelect } from "../components/StoreFilterSelect";
import { formatSalaryMonth, salaryMonthFromIsoDate } from "../logic/salaryMonth";
import type { SalaryPaymentResponse } from "../types/payrollTypes";

// Salary Payments: every salary payment that was recorded (append-only), newest first, for a store and a range of payment dates. Payments are entered under
// View Salary Sheet; this list is the payment history of the company.
export function SalaryPaymentsPage() {
  const { translateMessage } = useTranslation();
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const columns = useMemo<DataGridColumn<SalaryPaymentResponse>[]>(
    () => [
      { key: "date", header: translateMessage("payroll.payments.column.paidOn"), isSortable: true, render: (payment) => <span dir="ltr">{payment.paidOn}</span> },
      { key: "name", header: translateMessage("payroll.payments.column.employee"), isSortable: true, render: (payment) => payment.employeeName },
      { key: "store", header: translateMessage("payroll.payments.column.store"), isSecondary: true, render: (payment) => payment.storeName },
      {
        key: "month",
        header: translateMessage("payroll.payments.column.month"),
        isSortable: true,
        isSecondary: true,
        render: (payment) => {
          const salaryMonth = salaryMonthFromIsoDate(payment.periodMonth);
          return salaryMonth ? formatSalaryMonth(salaryMonth, translateMessage) : payment.periodMonth;
        },
      },
      { key: "amount", header: translateMessage("payroll.payments.column.amount"), isSortable: true, alignment: "end", render: (payment) => <span dir="ltr">{formatWholeRupees(payment.amount, { withSymbol: false })}</span> },
      { key: "method", header: translateMessage("payroll.payments.column.method"), isSecondary: true, render: (payment) => translateMessage(`payroll.method.${payment.methodCode}`) },
      { key: "reference", header: translateMessage("payroll.payments.column.reference"), isSecondary: true, render: (payment) => payment.reference ?? "" },
      { key: "paidBy", header: translateMessage("payroll.payments.column.paidBy"), isSecondary: true, render: (payment) => payment.paidByName ?? "" },
    ],
    [translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("payroll.salaryPayments.title")} subtitle={translateMessage("payroll.salaryPayments.subtitle")} />
      <SectionCard>
        <div className="grid items-end gap-4 sm:grid-cols-3">
          <StoreFilterSelect
            name="salary-payments-store"
            label={translateMessage("payroll.salaryPayments.filter.store")}
            allStoresLabel={translateMessage("payroll.salaryPayments.filter.allStores")}
            storeId={storeId}
            onStoreIdChange={setStoreId}
          />
          <DateField label={translateMessage("payroll.salaryPayments.filter.from")} name="salary-payments-from" value={fromDate} onValueChange={setFromDate} />
          <DateField label={translateMessage("payroll.salaryPayments.filter.to")} name="salary-payments-to" value={toDate} onValueChange={setToDate} />
        </div>
      </SectionCard>
      <SectionCard isPadded={false}>
        <ServerPaginatedDataGrid<SalaryPaymentResponse>
          path={ApiEndpoints.payroll.payments}
          columns={columns}
          getRowKey={(payment) => payment.id}
          caption={translateMessage("payroll.salaryPayments.title")}
          emptyTitle={translateMessage("payroll.salaryPayments.empty.title")}
          emptyText={translateMessage("payroll.salaryPayments.empty.text")}
          filters={{ storeId: storeId || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined }}
          searchPlaceholder={translateMessage("payroll.salaryPayments.searchPlaceholder")}
          defaultSort={{ columnKey: "date", direction: "descending" }}
          buildTotalsRow={(rows) => ({ amount: <span dir="ltr">{formatWholeRupees(sumWholeRupees(rows.map((row) => row.amount)), { withSymbol: false })}</span> })}
        />
      </SectionCard>
    </div>
  );
}
