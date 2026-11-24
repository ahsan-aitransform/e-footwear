"use client";

import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { PrintButton, PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { ExportCsvButton } from "@/features/catalogue/components/ExportCsvButton";
import { InventoryReportFilterBar, type InventoryReportFilters } from "../components/InventoryReportFilterBar";
import { InventoryStatusBadge } from "../components/InventoryStatusBadge";
import { StockAuditComparisonTable } from "../components/StockAuditComparisonTable";
import { InventoryDocumentStatusCodes, type StockAuditListItemResponse, type StockAuditResponse } from "../types/inventoryTypes";

// Stock Audit Report (docx 8.24): the audits of a store and period; open one to see, size by size, the quantity in the books, the quantity counted, the difference and
// its value. Reading only: counting, "Adjust Stock" and "Delete" belong to the Stock Audit screen.
export function StockAuditReportPage() {
  const { translateMessage } = useTranslation();
  const [filters, setFilters] = useState<InventoryReportFilters>();
  const [selectedAuditId, setSelectedAuditId] = useState<string>();

  const columns = useMemo<DataGridColumn<StockAuditListItemResponse>[]>(
    () => [
      { key: "number", header: translateMessage("inventory.detail.number"), alignment: "end", render: (audit) => audit.documentNumber },
      { key: "store", header: translateMessage("inventory.common.store"), render: (audit) => audit.storeName },
      { key: "date", header: translateMessage("inventory.common.date"), render: (audit) => audit.auditDate },
      { key: "pieces", header: translateMessage("inventory.audit.report.pieces"), alignment: "end", render: (audit) => formatQuantity(audit.scannedPieceCount) },
      { key: "items", header: translateMessage("inventory.audit.summary.countedItems"), alignment: "end", render: (audit) => audit.scannedItemCount },
      { key: "status", header: translateMessage("inventory.detail.status"), render: (audit) => <InventoryStatusBadge statusCode={audit.statusCode} /> },
    ],
    [translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.audit.reportPage.title")} subtitle={translateMessage("inventory.audit.reportPage.subtitle")} />
      <SectionCard>
        <InventoryReportFilterBar onShow={(next) => { setFilters(next); setSelectedAuditId(undefined); }} />
      </SectionCard>
      {selectedAuditId && <AuditReportDetail auditId={selectedAuditId} onClosed={() => setSelectedAuditId(undefined)} />}
      {filters && (
        <SectionCard isPadded={false}>
          <ServerPaginatedDataGrid<StockAuditListItemResponse>
            key={`${filters.storeId}-${filters.fromDate}-${filters.toDate}`}
            path={ApiEndpoints.inventory.stockAudits.reportList}
            filters={{ storeId: filters.storeId || undefined, fromDate: filters.fromDate, toDate: filters.toDate }}
            columns={columns}
            getRowKey={(audit) => audit.id}
            caption={translateMessage("inventory.audit.reportPage.title")}
            emptyTitle={translateMessage("inventory.report.empty")}
            isSearchEnabled={false}
            onRowOpen={(audit) => setSelectedAuditId(audit.id)}
          />
        </SectionCard>
      )}
    </div>
  );
}

function AuditReportDetail({ auditId, onClosed }: { auditId: string; onClosed: () => void }) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const [includeUnscannedItems, setIncludeUnscannedItems] = useState(false);
  const audit = useApiQuery<StockAuditResponse>(ApiEndpoints.inventory.stockAudits.reportById(auditId), { query: { includeUnscannedItems } });
  const data = audit.data;

  return (
    <SectionCard
      title={data ? translateMessage("inventory.audit.report.title", { number: data.documentNumber }) : undefined}
      action={
        <Button type="button" variant="outline" className="print:hidden" onClick={onClosed}>
          {translateMessage("inventory.common.close")}
        </Button>
      }
    >
      {audit.status === "loading" && !data && <LoadingIndicator />}
      {audit.status === "error" && <FormResultNotice errorMessage={audit.problem?.message ?? translateMessage("inventory.audit.failed")} />}
      {data && (
        <div className="space-y-4">
          <PrintedReportHeading title={translateMessage("inventory.audit.report.title", { number: data.documentNumber })} />
          {data.statusCode === InventoryDocumentStatusCodes.draft && <InlineNotice tone={ToneNames.info}>{translateMessage("inventory.audit.report.stillCounting")}</InlineNotice>}
          <StockAuditComparisonTable audit={data} />
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            {data.statusCode === InventoryDocumentStatusCodes.draft && (
              <div className="flex items-center gap-2">
                <Checkbox id="audit-report-unscanned" checked={includeUnscannedItems} onCheckedChange={(checked) => setIncludeUnscannedItems(checked === true)} />
                <Label htmlFor="audit-report-unscanned">{translateMessage("inventory.audit.addNonScanned")}</Label>
              </div>
            )}
            {hasPermission(PermissionCodes.REPORTS.STOCK_AUDIT_REPORT.PRINT) && <PrintButton />}
            {hasPermission(PermissionCodes.REPORTS.STOCK_AUDIT_REPORT.EXPORT) && (
              <ExportCsvButton
                fileName={`stock-audit-${data.documentNumber}.csv`}
                loadTable={async () => ({
                  headers: ["Barcode", "Product", "Category", "Brand", "Gender", "Season", "Size", "Expected", "Counted", "Difference", "Purchase price", "Sale price", "Amount"],
                  rows: data.lines.map((line) => [line.barcode, line.productName, line.categoryName, line.brandName, line.genderName, line.seasonName, line.sizeCode, line.expectedQuantity, line.countedQuantity, line.differenceQuantity, line.purchasePriceAmount, line.salePriceAmount, line.differenceAmount]),
                })}
              />
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
