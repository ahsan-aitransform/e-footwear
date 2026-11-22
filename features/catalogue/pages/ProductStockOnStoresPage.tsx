"use client";

import { useMemo } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PrintButton, PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { ExportCsvButton } from "../components/ExportCsvButton";
import { fetchAllPagesOfList } from "../hooks/fetchAllPagesOfList";
import type { ProductStockByStoreRowResponse } from "../types/catalogueTypes";

// Products Stock with Sizes on Multiple Stores (docx 4.14): for every product, the stock of each size in each store the person may see.
// The search box finds a product by name, code or barcode. Print and Export follow the person's permissions.
export function ProductStockOnStoresPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const mayPrint = hasPermission(PermissionCodes.PRODUCTS.PRODUCTS_STOCK_WITH_SIZES_ON_MULTIPLE_STORES.PRINT);
  const mayExport = hasPermission(PermissionCodes.PRODUCTS.PRODUCTS_STOCK_WITH_SIZES_ON_MULTIPLE_STORES.EXPORT);

  const columns = useMemo<DataGridColumn<ProductStockByStoreRowResponse>[]>(
    () => [
      { key: "productCode", header: translateMessage("catalogue.field.productCode"), render: (row) => <span dir="ltr">{row.productCode}</span> },
      { key: "productName", header: translateMessage("catalogue.field.productName"), render: (row) => row.productName },
      { key: "storeName", header: translateMessage("catalogue.filter.store"), render: (row) => row.storeName },
      { key: "sizeCode", header: translateMessage("catalogue.field.size"), render: (row) => row.sizeCode },
      { key: "barcode", header: translateMessage("catalogue.field.barcode"), isSecondary: true, render: (row) => <span dir="ltr">{row.barcode}</span> },
      { key: "stockQuantity", header: translateMessage("catalogue.field.stock"), alignment: "end", render: (row) => formatQuantity(row.stockQuantity) },
    ],
    [translateMessage],
  );

  async function loadExportTable() {
    const result = await fetchAllPagesOfList<ProductStockByStoreRowResponse>(ApiEndpoints.products.stockByStore, {});
    if (!result.ok) return { errorMessage: result.problem.message };
    return {
      headers: [translateMessage("catalogue.field.productCode"), translateMessage("catalogue.field.productName"), translateMessage("catalogue.filter.store"), translateMessage("catalogue.field.size"), translateMessage("catalogue.field.barcode"), translateMessage("catalogue.field.stock")],
      rows: result.rows.map((row) => [row.productCode, row.productName, row.storeName, row.sizeCode, row.barcode, row.stockQuantity]),
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("navigation.item.productStockWithSizes")}
        subtitle={translateMessage("catalogue.stockOnStores.subtitle")}
        actions={
          <div className="flex gap-2">
            {mayPrint && <PrintButton />}
            {mayExport && <ExportCsvButton fileName="products-stock-with-sizes.csv" loadTable={loadExportTable} />}
          </div>
        }
      />
      <PrintedReportHeading title={translateMessage("navigation.item.productStockWithSizes")} />
      <SectionCard isPadded={false}>
        <ServerPaginatedDataGrid<ProductStockByStoreRowResponse>
          path={ApiEndpoints.products.stockByStore}
          columns={columns}
          getRowKey={(row) => `${row.productId}|${row.storeId}|${row.barcode}`}
          caption={translateMessage("navigation.item.productStockWithSizes")}
          emptyTitle={translateMessage("catalogue.empty.title")}
          emptyText={translateMessage("catalogue.empty.text")}
          searchPlaceholder={translateMessage("catalogue.search.placeholder")}
          offlineCacheName="catalogueStockOnStores"
        />
      </SectionCard>
    </div>
  );
}
