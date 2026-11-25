"use client";

import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { DateField } from "@/components/forms/DateField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { classifyCashDifference } from "../logic/cashCountCalculations";
import type { CashCountListItemResponse } from "../types/cashTypes";

// View Cash Detail (docx 3.7): the saved cash counts of the stores the person may see, newest first, with expected,
// counted and the difference. Read only: a count is changed by saving that day's count again in the Cash Calculator.
export function ViewCashDetailsPage() {
  const { translateMessage } = useTranslation();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const columns = useMemo<DataGridColumn<CashCountListItemResponse>[]>(
    () => [
      { key: "date", header: translateMessage("cash.field.countDate"), isSortable: true, render: (row) => <span dir="ltr">{row.countDate}</span> },
      { key: "store", header: translateMessage("cash.column.store"), isSortable: true, isSecondary: true, render: (row) => row.storeName },
      { key: "expectedCash", header: translateMessage("cash.total.expected"), alignment: "end", render: (row) => formatWholeRupees(row.expectedCash) },
      { key: "countedCash", header: translateMessage("cash.total.counted"), alignment: "end", render: (row) => formatWholeRupees(row.countedCash) },
      {
        key: "difference",
        header: translateMessage("cash.total.difference"),
        alignment: "end",
        isSortable: true,
        render: (row) => `${formatWholeRupees(row.differenceAmount)} (${translateMessage(`cash.difference.${classifyCashDifference(row.differenceAmount)}`)})`,
      },
      { key: "countedByName", header: translateMessage("cash.column.countedBy"), isSecondary: true, render: (row) => row.countedByName ?? "" },
    ],
    [translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.viewCashDetails")} subtitle={translateMessage("cash.view.subtitle")} />
      <SectionCard>
        <div className="grid gap-4 md:grid-cols-2">
          <DateField label={translateMessage("customers.ledger.from")} name="cashViewFrom" value={fromDate} onValueChange={setFromDate} />
          <DateField label={translateMessage("customers.ledger.to")} name="cashViewTo" value={toDate} onValueChange={setToDate} />
        </div>
      </SectionCard>
      <SectionCard isPadded={false}>
        <ServerPaginatedDataGrid<CashCountListItemResponse>
          path={ApiEndpoints.cashCounts.list}
          columns={columns}
          getRowKey={(row) => row.id}
          caption={translateMessage("navigation.item.viewCashDetails")}
          emptyTitle={translateMessage("cash.view.empty")}
          filters={{ from: fromDate || undefined, to: toDate || undefined }}
          defaultSort={{ columnKey: "date", direction: "descending" }}
          isSearchEnabled={false}
          offlineCacheName="cashCountsList"
        />
      </SectionCard>
    </div>
  );
}
