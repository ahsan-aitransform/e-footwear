"use client";

import { useMemo, useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
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
import { buildProductClaimColumns } from "../logic/productClaimColumns";
import { ProductClaimStatusCodes, type ProductClaimReportResponse } from "../types/inventoryTypes";

// Claim Report (docx 8.31): the product claims of a store and period with their status; the total is the quantity and the value at the purchase price of all the claims
// listed (requested, approved and rejected claims are listed together unless a status is chosen).
export function ClaimReportPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const [statusCode, setStatusCode] = useState("");
  const [submitted, setSubmitted] = useState<{ filters: InventoryReportFilters; statusCode: string }>();
  const report = useApiQuery<ProductClaimReportResponse>(ApiEndpoints.inventory.productClaims.report, {
    query: submitted ? { storeId: submitted.filters.storeId || undefined, fromDate: submitted.filters.fromDate, toDate: submitted.filters.toDate, statusCode: submitted.statusCode || undefined } : {},
    enabled: submitted !== undefined,
  });
  const data = report.data;
  const columns = useMemo(() => {
    const base = buildProductClaimColumns(translateMessage, { showStatus: true });
    return base.map((column) => (column.key === "quantity" ? { ...column, totalCell: data ? formatQuantity(data.totalQuantity) : "" } : column.key === "purchase" ? { ...column, totalCell: data ? formatWholeRupees(data.totalValueAmount) : "" } : column));
  }, [data, translateMessage]);

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.report.claim.title")} subtitle={translateMessage("inventory.report.claim.subtitle")} />
      <SectionCard>
        <InventoryReportFilterBar
          onShow={(filters) => setSubmitted({ filters, statusCode })}
          extraFields={
            <FormField label={translateMessage("inventory.detail.status")} name="claimReportStatus">
              {(controlProps) => (
                <NativeSelect {...controlProps} value={statusCode} onChange={(event) => setStatusCode(event.target.value)}>
                  <option value="">{translateMessage("inventory.common.allStatuses")}</option>
                  <option value={ProductClaimStatusCodes.requested}>{translateMessage("inventory.status.requested")}</option>
                  <option value={ProductClaimStatusCodes.approved}>{translateMessage("inventory.status.approved")}</option>
                  <option value={ProductClaimStatusCodes.rejected}>{translateMessage("inventory.status.rejected")}</option>
                </NativeSelect>
              )}
            </FormField>
          }
          actions={
            data && (
              <>
                {hasPermission(PermissionCodes.REPORTS.CLAIM_REPORT.PRINT) && <PrintButton />}
                {hasPermission(PermissionCodes.REPORTS.CLAIM_REPORT.EXPORT) && (
                  <ExportCsvButton
                    fileName="claim-report.csv"
                    loadTable={async () => ({
                      headers: ["Number", "Date", "Store", "Barcode", "Product", "Size", "Brand", "Gender", "Season", "Quantity", "Purchase price", "Reason", "Status", "Description"],
                      rows: data.rows.map((claim) => [claim.claimNumber, claim.claimDate, claim.storeName, claim.barcode, claim.productName, claim.sizeCode, claim.brandName, claim.genderName, claim.seasonName, claim.quantity, claim.purchasePriceAmount, claim.reasonCode, claim.statusCode, claim.note]),
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
          <PrintedReportHeading title={translateMessage("inventory.report.claim.title")} />
          <DataGridTable
            rows={data?.rows ?? []}
            columns={columns}
            getRowKey={(claim) => claim.id}
            caption={translateMessage("inventory.report.claim.title")}
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
