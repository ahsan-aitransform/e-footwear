import type { DataGridColumn } from "@/components/data/dataGridTypes";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { InventoryStatusBadge } from "../components/InventoryStatusBadge";
import type { StockTransferListItemResponse } from "../types/inventoryTypes";

type Translate = (messageKey: MessageKey, parameters?: Record<string, string | number>) => string;

function formatTimestamp(isoTimestamp: string | null): string {
  return isoTimestamp === null ? "" : isoTimestamp.slice(0, 16).replace("T", " ");
}

// The columns of the transfer lists (sending list and receiving list): number, the other store, status, when, and the quantities.
export function buildStockTransferColumns(translateMessage: Translate, options: { showOtherStore: "to" | "from" }): DataGridColumn<StockTransferListItemResponse>[] {
  return [
    { key: "transferNumber", header: translateMessage("inventory.transfer.column.number"), alignment: "end", render: (transfer) => transfer.transferNumber },
    {
      key: "store",
      header: translateMessage(options.showOtherStore === "to" ? "inventory.transfer.column.toStore" : "inventory.transfer.column.fromStore"),
      render: (transfer) => (options.showOtherStore === "to" ? transfer.toStoreName : transfer.fromStoreName),
    },
    { key: "status", header: translateMessage("inventory.detail.status"), render: (transfer) => <InventoryStatusBadge statusCode={transfer.statusCode} /> },
    { key: "createdAt", header: translateMessage("inventory.transfer.column.created"), isSecondary: true, render: (transfer) => formatTimestamp(transfer.createdAt) },
    { key: "shippedAt", header: translateMessage("inventory.transfer.column.sentAt"), isSecondary: true, render: (transfer) => formatTimestamp(transfer.shippedAt) },
    { key: "scanned", header: translateMessage("inventory.transfer.column.scanned"), alignment: "end", isSecondary: true, render: (transfer) => formatQuantity(transfer.quantityScanned) },
    { key: "shipped", header: translateMessage("inventory.transfer.column.shipped"), alignment: "end", render: (transfer) => formatQuantity(transfer.quantityShipped) },
    { key: "received", header: translateMessage("inventory.transfer.column.received"), alignment: "end", render: (transfer) => formatQuantity(transfer.quantityReceived) },
    { key: "missing", header: translateMessage("inventory.transfer.column.missing"), alignment: "end", render: (transfer) => formatQuantity(transfer.quantityMissing) },
  ];
}
