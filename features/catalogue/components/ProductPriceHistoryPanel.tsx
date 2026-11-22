"use client";

import { useMemo } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { Badge } from "@/components/ui/badge";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { PriceTypeCodes, type PriceHistoryEntryResponse } from "../types/catalogueTypes";

// The price history of a product (append-only in the database): every change of a sale or purchase price, for the list price or for a store,
// with the old and the new price, the reason and who made it.
export function ProductPriceHistoryPanel({ productId }: { productId: string }) {
  const { translateMessage } = useTranslation();
  const columns = useMemo<DataGridColumn<PriceHistoryEntryResponse>[]>(
    () => [
      { key: "changedAt", header: translateMessage("catalogue.history.changedAt"), render: (row) => new Date(row.changedAt).toLocaleString() },
      { key: "sizeCode", header: translateMessage("catalogue.field.size"), render: (row) => row.sizeCode },
      { key: "barcode", header: translateMessage("catalogue.field.barcode"), isSecondary: true, render: (row) => <span dir="ltr">{row.barcode}</span> },
      { key: "priceType", header: translateMessage("catalogue.history.priceType"), render: (row) => <Badge variant="outline">{translateMessage(row.priceType === PriceTypeCodes.purchase ? "catalogue.changePrices.purchasePrice" : "catalogue.changePrices.salePrice")}</Badge> },
      { key: "storeName", header: translateMessage("catalogue.filter.store"), isSecondary: true, render: (row) => row.storeName ?? translateMessage("catalogue.history.listPrice") },
      { key: "oldPrice", header: translateMessage("catalogue.history.oldPrice"), alignment: "end", render: (row) => (row.oldPrice === null ? "" : formatWholeRupees(row.oldPrice, { withSymbol: false })) },
      { key: "newPrice", header: translateMessage("catalogue.history.newPrice"), alignment: "end", render: (row) => formatWholeRupees(row.newPrice, { withSymbol: false }) },
      { key: "reason", header: translateMessage("catalogue.replaceBarcodes.reason"), isSecondary: true, render: (row) => row.reason ?? "" },
      { key: "changedByName", header: translateMessage("catalogue.replaceBarcodes.changedBy"), isSecondary: true, render: (row) => row.changedByName ?? "" },
    ],
    [translateMessage],
  );
  return (
    <ServerPaginatedDataGrid<PriceHistoryEntryResponse>
      path={ApiEndpoints.products.priceHistory(productId)}
      columns={columns}
      getRowKey={(row) => row.id}
      caption={translateMessage("catalogue.history.title")}
      emptyTitle={translateMessage("catalogue.history.empty")}
      isSearchEnabled={false}
    />
  );
}
