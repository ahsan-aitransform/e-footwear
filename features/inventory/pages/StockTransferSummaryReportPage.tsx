"use client";

import { useMemo, useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { PrintButton, PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { ExportCsvButton } from "@/features/catalogue/components/ExportCsvButton";
import { InventoryReportFilterBar, type InventoryReportFilters } from "../components/InventoryReportFilterBar";
import type { StockTransferSummaryResponse } from "../types/inventoryTypes";

type Row = StockTransferSummaryResponse["rows"][number];

// Stock Transfer Summary (docx 8.22): for each pair of stores (sender to receiver) how many transfers were sent in the period and how many pieces and what value moved.
// Only transfers that have left the sender are counted; each transfer is counted once however many lines it has.
export function StockTransferSummaryReportPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const [filters, setFilters] = useState<InventoryReportFilters>();
  const report = useApiQuery<StockTransferSummaryResponse>(ApiEndpoints.inventory.reports.stockTransferSummary, {
    query: { storeId: filters?.storeId || undefined, fromDate: filters?.fromDate, toDate: filters?.toDate },
    enabled: filters !== undefined,
  });
  const data = report.data;

  const columns = useMemo<DataGridColumn<Row>[]>(
    () => [
      { key: "from", header: translateMessage("inventory.transfer.column.fromStore"), render: (row) => row.fromStoreName },
      { key: "to", header: translateMessage("inventory.transfer.column.toStore"), render: (row) => row.toStoreName },
      { key: "count", header: translateMessage("inventory.report.summary.transfers"), alignment: "end", render: (row) => row.transferCount, totalCell: data ? data.totalTransferCount : "" },
      { key: "shipped", header: translateMessage("inventory.transfer.column.shipped"), alignment: "end", render: (row) => formatQuantity(row.quantityShipped), totalCell: data ? formatQuantity(data.totalQuantityShipped) : "" },
      { key: "received", header: translateMessage("inventory.transfer.column.received"), alignment: "end", render: (row) => formatQuantity(row.quantityReceived), totalCell: data ? formatQuantity(data.totalQuantityReceived) : "" },
      { key: "missing", header: translateMessage("inventory.transfer.column.missing"), alignment: "end", render: (row) => formatQuantity(row.quantityMissing), totalCell: data ? formatQuantity(data.totalQuantityMissing) : "" },
      { key: "value", header: translateMessage("inventory.column.total"), alignment: "end", render: (row) => formatWholeRupees(row.valueAmount), totalCell: data ? formatWholeRupees(data.totalValueAmount) : "" },
    ],
    [data, translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.report.summary.title")} subtitle={translateMessage("inventory.report.summary.subtitle")} />
      <SectionCard>
        <InventoryReportFilterBar
          onShow={setFilters}
          actions={
            data && (
              <>
                {hasPermission(PermissionCodes.REPORTS.STOCK_TRANSFER_SUMMARY.PRINT) && <PrintButton />}
                {hasPermission(PermissionCodes.REPORTS.STOCK_TRANSFER_SUMMARY.EXPORT) && (
                  <ExportCsvButton
                    fileName="stock-transfer-summary.csv"
                    loadTable={async () => ({
                      headers: ["From", "To", "Transfers", "Sent", "Received", "Missing", "Value"],
                      rows: data.rows.map((row) => [row.fromStoreName, row.toStoreName, row.transferCount, row.quantityShipped, row.quantityReceived, row.quantityMissing, row.valueAmount]),
                    })}
                  />
                )}
              </>
            )
          }
        />
      </SectionCard>
      {filters && (
        <SectionCard isPadded={false}>
          <PrintedReportHeading title={translateMessage("inventory.report.summary.title")} />
          <DataGridTable
            rows={data?.rows ?? []}
            columns={columns}
            getRowKey={(row) => `${row.fromStoreName}-${row.toStoreName}`}
            caption={translateMessage("inventory.report.summary.title")}
            isLoading={report.status === "loading"}
            errorMessage={report.status === "error" ? (report.problem?.message ?? translateMessage("inventory.report.failed")) : undefined}
            emptyTitle={translateMessage("inventory.report.empty")}
            showTotalsRow
            totalsRowLabel={translateMessage("inventory.column.totals")}
          />
        </SectionCard>
      )}
    </div>
  );
}
