"use client";

import { useMemo, useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { TextInputField } from "@/components/forms/TextInputField";
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
import { InventoryStatusBadge } from "../components/InventoryStatusBadge";
import { TransferReportScopeCodes, type StockTransferReportResponse, type TransferReportScopeCode } from "../types/inventoryTypes";

type Row = StockTransferReportResponse["rows"][number];

// Stock Transfer Report (docx 8.21): the lines of the transfers in a period, for all transfers, one transfer number, or one store (sent or received). One row per size:
// the pieces sent, received and missing, and their value. Cancelled drafts are not listed.
export function StockTransferReportPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const [scopeCode, setScopeCode] = useState<TransferReportScopeCode>(TransferReportScopeCodes.all);
  const [transferNumber, setTransferNumber] = useState("");
  const [submitted, setSubmitted] = useState<{ filters: InventoryReportFilters; scopeCode: TransferReportScopeCode; transferNumber: string }>();
  const report = useApiQuery<StockTransferReportResponse>(ApiEndpoints.inventory.reports.stockTransfers, {
    query: submitted
      ? {
          scopeCode: submitted.scopeCode,
          transferNumber: submitted.scopeCode === TransferReportScopeCodes.byTransfer ? submitted.transferNumber : undefined,
          storeId: submitted.scopeCode === TransferReportScopeCodes.byStore ? submitted.filters.storeId || undefined : undefined,
          fromDate: submitted.filters.fromDate,
          toDate: submitted.filters.toDate,
        }
      : {},
    enabled: submitted !== undefined,
  });
  const data = report.data;

  const columns = useMemo<DataGridColumn<Row>[]>(
    () => [
      { key: "number", header: translateMessage("inventory.transfer.column.number"), alignment: "end", render: (row) => row.transferNumber },
      { key: "from", header: translateMessage("inventory.transfer.column.fromStore"), render: (row) => row.fromStoreName },
      { key: "to", header: translateMessage("inventory.transfer.column.toStore"), render: (row) => row.toStoreName },
      { key: "status", header: translateMessage("inventory.detail.status"), isSecondary: true, render: (row) => <InventoryStatusBadge statusCode={row.statusCode} /> },
      { key: "barcode", header: translateMessage("inventory.column.barcode"), render: (row) => <span dir="ltr">{row.barcode}</span> },
      { key: "product", header: translateMessage("inventory.column.product"), render: (row) => `${row.productName} (${row.sizeCode})` },
      { key: "shipped", header: translateMessage("inventory.transfer.column.shipped"), alignment: "end", render: (row) => formatQuantity(row.quantityShipped), totalCell: data ? formatQuantity(data.totalQuantityShipped) : "" },
      { key: "received", header: translateMessage("inventory.transfer.column.received"), alignment: "end", render: (row) => formatQuantity(row.quantityReceived), totalCell: data ? formatQuantity(data.totalQuantityReceived) : "" },
      { key: "missing", header: translateMessage("inventory.transfer.column.missing"), alignment: "end", render: (row) => formatQuantity(row.quantityMissing), totalCell: data ? formatQuantity(data.totalQuantityMissing) : "" },
      { key: "value", header: translateMessage("inventory.column.total"), alignment: "end", render: (row) => formatWholeRupees(row.valueAmount), totalCell: data ? formatWholeRupees(data.totalValueAmount) : "" },
    ],
    [data, translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.report.transfer.title")} subtitle={translateMessage("inventory.report.transfer.subtitle")} />
      <SectionCard>
        <InventoryReportFilterBar
          isStoreEnabled={scopeCode === TransferReportScopeCodes.byStore}
          onShow={(filters) => setSubmitted({ filters, scopeCode, transferNumber })}
          extraFields={
            <>
              <FormField label={translateMessage("inventory.report.transfer.scope")} name="transferReportScope">
                {(controlProps) => (
                  <NativeSelect {...controlProps} value={scopeCode} onChange={(event) => setScopeCode(event.target.value as TransferReportScopeCode)}>
                    <option value={TransferReportScopeCodes.all}>{translateMessage("inventory.report.transfer.scopeAll")}</option>
                    <option value={TransferReportScopeCodes.byTransfer}>{translateMessage("inventory.report.transfer.scopeByTransfer")}</option>
                    <option value={TransferReportScopeCodes.byStore}>{translateMessage("inventory.report.transfer.scopeByStore")}</option>
                  </NativeSelect>
                )}
              </FormField>
              {scopeCode === TransferReportScopeCodes.byTransfer && (
                <TextInputField label={translateMessage("inventory.transfer.column.number")} name="transferReportNumber" inputMode="numeric" dir="ltr" value={transferNumber} onChange={(event) => setTransferNumber(event.target.value)} />
              )}
            </>
          }
          actions={
            data && (
              <>
                {hasPermission(PermissionCodes.REPORTS.STOCK_TRANSFER_REPORT.PRINT) && <PrintButton />}
                {hasPermission(PermissionCodes.REPORTS.STOCK_TRANSFER_REPORT.EXPORT) && (
                  <ExportCsvButton
                    fileName="stock-transfer-report.csv"
                    loadTable={async () => ({
                      headers: ["Number", "From", "To", "Barcode", "Product", "Size", "Sent", "Received", "Missing", "Value"],
                      rows: data.rows.map((row) => [row.transferNumber, row.fromStoreName, row.toStoreName, row.barcode, row.productName, row.sizeCode, row.quantityShipped, row.quantityReceived, row.quantityMissing, row.valueAmount]),
                    })}
                  />
                )}
              </>
            )
          }
        />
      </SectionCard>
      {submitted && (
        <SectionCard isPadded={false}>
          <PrintedReportHeading title={translateMessage("inventory.report.transfer.title")} />
          <DataGridTable
            rows={data?.rows ?? []}
            columns={columns}
            getRowKey={(row) => `${row.transferId}-${row.barcode}`}
            caption={translateMessage("inventory.report.transfer.title")}
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
