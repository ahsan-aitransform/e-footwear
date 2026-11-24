import type { DataGridColumn } from "@/components/data/dataGridTypes";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { InventoryStatusBadge } from "../components/InventoryStatusBadge";
import type { ProductClaimResponse } from "../types/inventoryTypes";
import { claimReasonMessageKey } from "./inventoryStatusPresentation";

type Translate = (messageKey: MessageKey, parameters?: Record<string, string | number>) => string;

// The columns shared by the claim list, the claim approval grid and the claim report (docx 4.17: Invoice Code, Date, Product Name, Company, Gender, Season,
// Pur. Price, Description). "Company" of the docx is the brand of the article.
export function buildProductClaimColumns(translateMessage: Translate, options: { showStatus: boolean }): DataGridColumn<ProductClaimResponse>[] {
  const columns: DataGridColumn<ProductClaimResponse>[] = [
    { key: "claimNumber", header: translateMessage("inventory.claim.column.number"), alignment: "end", render: (claim) => claim.claimNumber },
    { key: "date", header: translateMessage("inventory.common.date"), render: (claim) => claim.claimDate },
    { key: "store", header: translateMessage("inventory.common.store"), isSecondary: true, render: (claim) => claim.storeName },
    { key: "product", header: translateMessage("inventory.column.product"), render: (claim) => `${claim.productName} (${claim.sizeCode})` },
    { key: "barcode", header: translateMessage("inventory.column.barcode"), isSecondary: true, render: (claim) => <span dir="ltr">{claim.barcode}</span> },
    { key: "brand", header: translateMessage("inventory.column.brand"), isSecondary: true, render: (claim) => claim.brandName ?? "" },
    { key: "gender", header: translateMessage("inventory.column.gender"), isSecondary: true, render: (claim) => claim.genderName ?? "" },
    { key: "season", header: translateMessage("inventory.column.season"), isSecondary: true, render: (claim) => claim.seasonName ?? "" },
    { key: "quantity", header: translateMessage("inventory.column.quantity"), alignment: "end", render: (claim) => formatQuantity(claim.quantity) },
    { key: "purchase", header: translateMessage("inventory.column.purchasePrice"), alignment: "end", render: (claim) => formatWholeRupees(claim.purchasePriceAmount) },
    { key: "reason", header: translateMessage("inventory.column.reason"), render: (claim) => translateMessage(claimReasonMessageKey(claim.reasonCode)) },
    { key: "note", header: translateMessage("inventory.common.description"), isSecondary: true, render: (claim) => claim.note ?? "" },
  ];
  if (options.showStatus) columns.push({ key: "status", header: translateMessage("inventory.detail.status"), render: (claim) => <InventoryStatusBadge statusCode={claim.statusCode} /> });
  return columns;
}
