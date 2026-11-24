"use client";

import { useMemo } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { RoundingModes } from "@/lib/constants/moneyFormat";
import { formatWholeRupees, multiplyWholeRupeesByQuantity } from "@/lib/money/wholeRupeeAmount";
import { kindMessageKey } from "../logic/inventoryStatusPresentation";
import type { StockAdjustmentLineResponse, StockAdjustmentResponse } from "../types/inventoryTypes";
import { InventoryStatusBadge } from "./InventoryStatusBadge";

// One stock adjustment as it was posted: the header (store, date, number, kind, status) and every line with its quantity, cost and total. Used after saving,
// in the history and on paper (the Print button of the page prints this card).
export function StockAdjustmentDetailCard({ adjustment }: { adjustment: StockAdjustmentResponse }) {
  const { translateMessage } = useTranslation();
  const columns = useMemo<DataGridColumn<StockAdjustmentLineResponse>[]>(
    () => [
      { key: "barcode", header: translateMessage("inventory.column.barcode"), render: (line) => <span dir="ltr">{line.barcode}</span> },
      { key: "product", header: translateMessage("inventory.column.product"), render: (line) => line.productName },
      { key: "size", header: translateMessage("inventory.column.size"), render: (line) => line.sizeCode },
      {
        key: "added",
        header: translateMessage("inventory.column.added"),
        alignment: "end",
        render: (line) => (line.quantity > 0 ? formatQuantity(line.quantity) : ""),
        totalCell: formatQuantity(adjustment.addedQuantity),
      },
      {
        key: "removed",
        header: translateMessage("inventory.column.removed"),
        alignment: "end",
        render: (line) => (line.quantity < 0 ? formatQuantity(-line.quantity) : ""),
        totalCell: formatQuantity(adjustment.removedQuantity),
      },
      { key: "cost", header: translateMessage("inventory.column.unitCost"), alignment: "end", render: (line) => formatWholeRupees(line.unitCostAmount) },
      {
        key: "total",
        header: translateMessage("inventory.column.total"),
        alignment: "end",
        render: (line) => formatWholeRupees(multiplyWholeRupeesByQuantity(line.unitCostAmount, line.quantity, RoundingModes.nearest)),
        totalCell: formatWholeRupees(adjustment.netValueAmount),
      },
      { key: "reason", header: translateMessage("inventory.column.reason"), isSecondary: true, render: (line) => line.reasonText ?? "" },
    ],
    [adjustment.addedQuantity, adjustment.netValueAmount, adjustment.removedQuantity, translateMessage],
  );

  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{translateMessage("inventory.detail.number")}</dt>
          <dd className="font-medium tabular-nums">{adjustment.documentNumber}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{translateMessage("inventory.common.store")}</dt>
          <dd className="font-medium">{adjustment.storeName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{translateMessage("inventory.common.date")}</dt>
          <dd className="font-medium tabular-nums">{adjustment.adjustmentDate}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{translateMessage("inventory.detail.status")}</dt>
          <dd>
            <InventoryStatusBadge statusCode={adjustment.statusCode} /> <span className="ms-1 text-muted-foreground">{translateMessage(kindMessageKey(adjustment.kindCode))}</span>
          </dd>
        </div>
        {adjustment.description && (
          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="text-muted-foreground">{translateMessage("inventory.common.description")}</dt>
            <dd>{adjustment.description}</dd>
          </div>
        )}
        {adjustment.createdByName && (
          <div>
            <dt className="text-muted-foreground">{translateMessage("inventory.detail.enteredBy")}</dt>
            <dd>{adjustment.createdByName}</dd>
          </div>
        )}
      </dl>
      <DataGridTable
        rows={adjustment.lines}
        columns={columns}
        getRowKey={(line) => line.variantId}
        caption={translateMessage("inventory.detail.linesCaption")}
        emptyTitle={translateMessage("inventory.detail.noLines")}
        showTotalsRow
        totalsRowLabel={translateMessage("inventory.column.totals")}
      />
    </div>
  );
}
