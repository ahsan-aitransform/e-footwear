"use client";

import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PrintButton, PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { CatalogueFilterFields } from "../components/CatalogueFilterFields";
import { ExportCsvButton } from "../components/ExportCsvButton";
import { fetchAllPagesOfList } from "../hooks/fetchAllPagesOfList";
import { useCatalogueLookups } from "../hooks/useCatalogueLookups";
import type { ProductListFilterValues, ProductReportRowResponse } from "../types/catalogueTypes";

// Product Report (docx 4.15): one line per product and store with its prices, brand, season, colour and stock, filtered by brand,
// season and colour. A product whose sizes have different prices shows the highest purchase and sale price (recorded in the status file).
export function ProductReportPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const lookups = useCatalogueLookups();
  const [filter, setFilter] = useState<ProductListFilterValues>({});
  const mayPrint = hasPermission(PermissionCodes.PRODUCTS.PRODUCT_REPORT.PRINT);
  const mayExport = hasPermission(PermissionCodes.PRODUCTS.PRODUCT_REPORT.EXPORT);
  const reportFilters = { brandId: filter.brandId, seasonId: filter.seasonId, colorId: filter.colorId };
  const [searchedFilters, setSearchedFilters] = useState(reportFilters);

  const columns = useMemo<DataGridColumn<ProductReportRowResponse>[]>(
    () => [
      { key: "productCode", header: translateMessage("catalogue.field.productCode"), render: (row) => <span dir="ltr">{row.productCode}</span> },
      { key: "productName", header: translateMessage("catalogue.field.productName"), render: (row) => row.productName },
      { key: "purchasePrice", header: translateMessage("catalogue.field.purchasePrice"), alignment: "end", render: (row) => formatWholeRupees(row.purchasePrice, { withSymbol: false }) },
      { key: "salePrice", header: translateMessage("catalogue.field.salePrice"), alignment: "end", render: (row) => formatWholeRupees(row.salePrice, { withSymbol: false }) },
      { key: "brandName", header: translateMessage("catalogue.field.brand"), isSecondary: true, render: (row) => row.brandName ?? "" },
      { key: "seasonName", header: translateMessage("catalogue.field.season"), isSecondary: true, render: (row) => row.seasonName ?? "" },
      { key: "colorName", header: translateMessage("catalogue.field.color"), isSecondary: true, render: (row) => row.colorName ?? "" },
      { key: "storeName", header: translateMessage("catalogue.filter.store"), render: (row) => row.storeName },
      { key: "stockQuantity", header: translateMessage("catalogue.field.stock"), alignment: "end", render: (row) => formatQuantity(row.stockQuantity) },
    ],
    [translateMessage],
  );

  async function loadExportTable() {
    const result = await fetchAllPagesOfList<ProductReportRowResponse>(ApiEndpoints.products.report, searchedFilters);
    if (!result.ok) return { errorMessage: result.problem.message };
    return {
      headers: [translateMessage("catalogue.field.productCode"), translateMessage("catalogue.field.productName"), translateMessage("catalogue.field.purchasePrice"), translateMessage("catalogue.field.salePrice"), translateMessage("catalogue.field.brand"), translateMessage("catalogue.field.season"), translateMessage("catalogue.field.color"), translateMessage("catalogue.filter.store"), translateMessage("catalogue.field.stock")],
      rows: result.rows.map((row) => [row.productCode, row.productName, row.purchasePrice, row.salePrice, row.brandName, row.seasonName, row.colorName, row.storeName, row.stockQuantity]),
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("navigation.item.productReport")}
        subtitle={translateMessage("catalogue.report.subtitle")}
        actions={
          <div className="flex gap-2">
            {mayPrint && <PrintButton />}
            {mayExport && <ExportCsvButton fileName="product-report.csv" loadTable={loadExportTable} />}
          </div>
        }
      />
      <SectionCard>
        <div className="print:hidden">
          <CatalogueFilterFields fields={["brandId", "seasonId", "colorId"]} values={filter} onChange={setFilter} lookups={lookups} />
        </div>
      </SectionCard>
      <PrintedReportHeading title={translateMessage("navigation.item.productReport")} />
      <SectionCard isPadded={false}>
        <ServerPaginatedDataGrid<ProductReportRowResponse>
          path={ApiEndpoints.products.report}
          columns={columns}
          getRowKey={(row) => `${row.productId}|${row.storeId}`}
          caption={translateMessage("navigation.item.productReport")}
          emptyTitle={translateMessage("catalogue.empty.title")}
          emptyText={translateMessage("catalogue.empty.text")}
          filters={reportFilters}
          onSearch={() => setSearchedFilters(reportFilters)}
          searchPlaceholder={translateMessage("catalogue.search.placeholder")}
          offlineCacheName="catalogueProductReport"
        />
      </SectionCard>
    </div>
  );
}
