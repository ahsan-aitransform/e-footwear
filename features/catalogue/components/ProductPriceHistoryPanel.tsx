"use client";

import { useMemo } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatPriceChange } from "../logic/priceHistoryFormatting";
import type { PriceHistoryEntryResponse } from "../types/catalogueTypes";

// The price history of a product (append-only in the database): one line per change, whatever sizes it covered, with the purchase and the
// sale price side by side. The last answer is kept on the device so the tab still opens offline.
export function ProductPriceHistoryPanel({ productId, productName, categoryName }: { productId: string; productName: string; categoryName: string }) {
  const { translateMessage } = useTranslation();
  const columns = useMemo<DataGridColumn<PriceHistoryEntryResponse>[]>(
    () => [
      { key: "changedAt", header: translateMessage("catalogue.history.changedAt"), render: (row) => new Date(row.changedAt).toLocaleString() },
      { key: "product", header: translateMessage("catalogue.field.productName"), render: () => productName },
      { key: "category", header: translateMessage("catalogue.filter.category"), render: () => categoryName },
      { key: "purchasePrice", header: translateMessage("catalogue.field.purchasePrice"), alignment: "end", render: (row) => <span dir="ltr">{formatPriceChange(row.oldPurchasePrice, row.newPurchasePriceLowest, row.newPurchasePriceHighest)}</span> },
      { key: "salePrice", header: translateMessage("catalogue.field.salePrice"), alignment: "end", render: (row) => <span dir="ltr">{formatPriceChange(row.oldSalePrice, row.newSalePriceLowest, row.newSalePriceHighest)}</span> },
      { key: "storeName", header: translateMessage("catalogue.filter.store"), isSecondary: true, render: (row) => row.storeName ?? translateMessage("catalogue.history.listPrice") },
      { key: "reason", header: translateMessage("catalogue.replaceBarcodes.reason"), isSecondary: true, render: (row) => row.reason ?? "" },
      { key: "changedByName", header: translateMessage("catalogue.replaceBarcodes.changedBy"), isSecondary: true, render: (row) => row.changedByName ?? "" },
    ],
    [translateMessage, productName, categoryName],
  );
  return (
    <ServerPaginatedDataGrid<PriceHistoryEntryResponse>
      path={ApiEndpoints.products.priceHistory(productId)}
      columns={columns}
      getRowKey={(row) => [row.changedAt, row.storeId, row.batchId, row.reason, row.changedByName].join("|")}
      caption={translateMessage("catalogue.history.title")}
      emptyTitle={translateMessage("catalogue.history.empty")}
      isSearchEnabled={false}
      offlineCacheName={`catalogue-price-history-${productId}`}
    />
  );
}
