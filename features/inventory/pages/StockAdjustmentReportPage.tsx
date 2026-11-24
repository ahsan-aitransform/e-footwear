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
import { kindMessageKey } from "../logic/inventoryStatusPresentation";
import type { StockAdjustmentReportResponse } from "../types/inventoryTypes";

type Row = StockAdjustmentReportResponse["rows"][number];

// Stock Adjustment Report (docx 8.20): every adjustment in force in the store and period, one row per size, with the pieces added and removed and their value. A voided
// adjustment and its reversal cancel each other out and are left out.
export function StockAdjustmentReportPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const [filters, setFilters] = useState<InventoryReportFilters>();
  const report = useApiQuery<StockAdjustmentReportResponse>(ApiEndpoints.inventory.reports.stockAdjustments, {
    query: { storeId: filters?.storeId || undefined, fromDate: filters?.fromDate, toDate: filters?.toDate },
    enabled: filters !== undefined,
  });
  const data = report.data;

  const columns = useMemo<DataGridColumn<Row>[]>(
    () => [
      { key: "store", header: translateMessage("inventory.common.store"), render: (row) => row.storeName },
      { key: "number", header: translateMessage("inventory.detail.number"), alignment: "end", render: (row) => row.documentNumber },
      { key: "date", header: translateMessage("inventory.common.date"), render: (row) => row.adjustmentDate },
      { key: "kind", header: translateMessage("inventory.detail.kind"), isSecondary: true, render: (row) => translateMessage(kindMessageKey(row.kindCode)) },
      { key: "barcode", header: translateMessage("inventory.column.barcode"), render: (row) => <span dir="ltr">{row.barcode}</span> },
      { key: "product", header: translateMessage("inventory.column.product"), render: (row) => row.productName },
      { key: "size", header: translateMessage("inventory.column.size"), render: (row) => row.sizeCode },
      { key: "added", header: translateMessage("inventory.column.added"), alignment: "end", render: (row) => (row.addedQuantity > 0 ? formatQuantity(row.addedQuantity) : ""), totalCell: data ? formatQuantity(data.totalAddedQuantity) : "" },
      { key: "removed", header: translateMessage("inventory.column.removed"), alignment: "end", render: (row) => (row.removedQuantity > 0 ? formatQuantity(row.removedQuantity) : ""), totalCell: data ? formatQuantity(data.totalRemovedQuantity) : "" },
      { key: "value", header: translateMessage("inventory.column.total"), alignment: "end", render: (row) => formatWholeRupees(row.valueAmount), totalCell: data ? formatWholeRupees(data.netValueAmount) : "" },
    ],
    [data, translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.report.adjustment.title")} subtitle={translateMessage("inventory.report.adjustment.subtitle")} />
      <SectionCard>
        <InventoryReportFilterBar
          onShow={setFilters}
          actions={
            data && (
              <>
                {hasPermission(PermissionCodes.REPORTS.STOCK_ADJUSTMENT_REPORT.PRINT) && <PrintButton />}
                {hasPermission(PermissionCodes.REPORTS.STOCK_ADJUSTMENT_REPORT.EXPORT) && (
                  <ExportCsvButton
                    fileName="stock-adjustment-report.csv"
                    loadTable={async () => ({
                      headers: ["Store", "Number", "Date", "Barcode", "Product", "Size", "Added", "Removed", "Value"],
                      rows: data.rows.map((row) => [row.storeName, row.documentNumber, row.adjustmentDate, row.barcode, row.productName, row.sizeCode, row.addedQuantity, row.removedQuantity, row.valueAmount]),
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
          <PrintedReportHeading title={translateMessage("inventory.report.adjustment.title")} />
          <DataGridTable
            rows={data?.rows ?? []}
            columns={columns}
            getRowKey={(row) => `${row.documentNumber}-${row.barcode}-${row.storeName}`}
            caption={translateMessage("inventory.report.adjustment.title")}
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
