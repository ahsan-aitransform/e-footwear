"use client";

import { useMemo } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import type { StockAuditLineResponse, StockAuditResponse } from "../types/inventoryTypes";
import { InventoryStatusBadge } from "./InventoryStatusBadge";

// The stock audit report (docx 8.24): for every counted size the quantity in the books, the quantity counted, the difference and its value at the purchase price,
// with the summary of counted, more, less and the value of the difference. Shown on the audit screen while counting and read-only afterwards.
export function StockAuditComparisonTable({ audit }: { audit: StockAuditResponse }) {
  const { translateMessage } = useTranslation();
  const columns = useMemo<DataGridColumn<StockAuditLineResponse>[]>(
    () => [
      { key: "barcode", header: translateMessage("inventory.column.barcode"), render: (line) => <span dir="ltr">{line.barcode}</span> },
      { key: "product", header: translateMessage("inventory.column.product"), render: (line) => line.productName },
      { key: "category", header: translateMessage("inventory.column.category"), isSecondary: true, render: (line) => line.categoryName ?? "" },
      { key: "brand", header: translateMessage("inventory.column.brand"), isSecondary: true, render: (line) => line.brandName ?? "" },
      { key: "gender", header: translateMessage("inventory.column.gender"), isSecondary: true, render: (line) => line.genderName ?? "" },
      { key: "season", header: translateMessage("inventory.column.season"), isSecondary: true, render: (line) => line.seasonName ?? "" },
      { key: "size", header: translateMessage("inventory.column.size"), render: (line) => line.sizeCode },
      { key: "expected", header: translateMessage("inventory.audit.expected"), alignment: "end", render: (line) => formatQuantity(line.expectedQuantity) },
      { key: "counted", header: translateMessage("inventory.audit.counted"), alignment: "end", render: (line) => formatQuantity(line.countedQuantity) },
      {
        key: "difference",
        header: translateMessage("inventory.audit.difference"),
        alignment: "end",
        render: (line) => (
          <span className={line.differenceQuantity < 0 ? "text-destructive" : line.differenceQuantity > 0 ? "text-primary" : undefined}>{formatQuantity(line.differenceQuantity)}</span>
        ),
      },
      { key: "purchase", header: translateMessage("inventory.column.purchasePrice"), alignment: "end", isSecondary: true, render: (line) => formatWholeRupees(line.purchasePriceAmount) },
      { key: "sale", header: translateMessage("inventory.column.salePrice"), alignment: "end", isSecondary: true, render: (line) => formatWholeRupees(line.salePriceAmount) },
      {
        key: "amount",
        header: translateMessage("inventory.audit.quantityAmount"),
        alignment: "end",
        render: (line) => formatWholeRupees(line.differenceAmount),
        totalCell: formatWholeRupees(audit.summary.differenceAmount),
      },
    ],
    [audit.summary.differenceAmount, translateMessage],
  );

  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{translateMessage("inventory.detail.number")}</dt>
          <dd className="font-medium tabular-nums">{audit.documentNumber}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{translateMessage("inventory.common.store")}</dt>
          <dd className="font-medium">{audit.storeName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{translateMessage("inventory.common.date")}</dt>
          <dd className="font-medium tabular-nums">{audit.auditDate}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{translateMessage("inventory.detail.status")}</dt>
          <dd>
            <InventoryStatusBadge statusCode={audit.statusCode} />
          </dd>
        </div>
      </dl>
      <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{translateMessage("inventory.audit.summary.countedItems")}</dt>
          <dd className="text-lg font-semibold tabular-nums">{audit.summary.countedItemCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{translateMessage("inventory.audit.summary.more")}</dt>
          <dd className="text-lg font-semibold tabular-nums">{audit.summary.moreItemCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{translateMessage("inventory.audit.summary.less")}</dt>
          <dd className="text-lg font-semibold tabular-nums">{audit.summary.lessItemCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{translateMessage("inventory.audit.summary.difference")}</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatWholeRupees(audit.summary.differenceAmount)}</dd>
        </div>
      </dl>
      <DataGridTable
        rows={audit.lines}
        columns={columns}
        getRowKey={(line) => line.variantId}
        caption={translateMessage("inventory.audit.caption")}
        emptyTitle={translateMessage("inventory.audit.empty")}
        emptyText={translateMessage("inventory.audit.emptyText")}
        showTotalsRow
        totalsRowLabel={translateMessage("inventory.column.totals")}
      />
    </div>
  );
}
