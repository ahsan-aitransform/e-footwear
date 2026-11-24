// The shapes of the Inventory API (backend: EFootwear.BLL/Inventory/Contracts). Money is whole rupees (an integer number); a quantity has at most 3 decimals and
// travels as a number. Codes are the strings the backend uses (EFootwear.Domain/Inventory/*Codes.cs).

export const InventoryDocumentStatusCodes = { draft: "DRAFT", posted: "POSTED", cancelled: "CANCELLED" } as const;
export type InventoryDocumentStatusCode = (typeof InventoryDocumentStatusCodes)[keyof typeof InventoryDocumentStatusCodes];

export const StockAdjustmentKindCodes = { manual: "MANUAL", countUpdate: "COUNT_UPDATE", reversal: "REVERSAL", auditAdjustment: "AUDIT_ADJUSTMENT" } as const;
export type StockAdjustmentKindCode = (typeof StockAdjustmentKindCodes)[keyof typeof StockAdjustmentKindCodes];

export const StockTransferStatusCodes = {
  draft: "DRAFT",
  shipped: "SHIPPED",
  receiving: "RECEIVING",
  completed: "COMPLETED",
  completedWithMissing: "COMPLETED_WITH_MISSING",
  cancelled: "CANCELLED",
} as const;
export type StockTransferStatusCode = (typeof StockTransferStatusCodes)[keyof typeof StockTransferStatusCodes];

export const TransferDirectionCodes = { all: "ALL", outgoing: "OUTGOING", incoming: "INCOMING" } as const;
export type TransferDirectionCode = (typeof TransferDirectionCodes)[keyof typeof TransferDirectionCodes];

export const ProductClaimStatusCodes = { requested: "REQUESTED", approved: "APPROVED", rejected: "REJECTED" } as const;
export type ProductClaimStatusCode = (typeof ProductClaimStatusCodes)[keyof typeof ProductClaimStatusCodes];

export const ProductClaimReasonCodes = { damaged: "DAMAGED", defective: "DEFECTIVE", lost: "LOST", other: "OTHER" } as const;
export type ProductClaimReasonCode = (typeof ProductClaimReasonCodes)[keyof typeof ProductClaimReasonCodes];

export const TransferLossCaseStatusCodes = { open: "OPEN", assigned: "ASSIGNED", found: "FOUND", writtenOff: "WRITTEN_OFF" } as const;
export type TransferLossCaseStatusCode = (typeof TransferLossCaseStatusCodes)[keyof typeof TransferLossCaseStatusCodes];

export const TransferLossDecisionCodes = { found: "FOUND", charge: "CHARGE" } as const;
export type TransferLossDecisionCode = (typeof TransferLossDecisionCodes)[keyof typeof TransferLossDecisionCodes];

export const TransferLossBearerCodes = { company: "COMPANY", senderStore: "SENDER_STORE", receiverStore: "RECEIVER_STORE" } as const;
export type TransferLossBearerCode = (typeof TransferLossBearerCodes)[keyof typeof TransferLossBearerCodes];

export const TransferReportScopeCodes = { all: "ALL", byTransfer: "BY_TRANSFER", byStore: "BY_STORE" } as const;
export type TransferReportScopeCode = (typeof TransferReportScopeCodes)[keyof typeof TransferReportScopeCodes];

// ---- lookups

export type InventoryItemResponse = {
  variantId: string;
  productCode: string;
  productName: string;
  productNameUrdu: string | null;
  unitName: string | null;
  sizeCode: string;
  colorName: string | null;
  barcode: string;
  stockQuantity: number;
  purchasePriceAmount: number;
};

export type NonZeroStockRowResponse = {
  variantId: string;
  barcode: string;
  productName: string;
  sizeCode: string;
  purchasePriceAmount: number;
  stockQuantity: number;
};

export type InventoryStoreResponse = { id: string; code: string; name: string; isUserStore: boolean };

// ---- stock adjustment

export type StockAdjustmentLineRequest = { variantId: string; quantity: number; unitCostAmount: number | null; reasonText: string | null };

export type CreateStockAdjustmentRequest = {
  storeId: string;
  adjustmentDate: string;
  clientTransactionId: string;
  description: string | null;
  lines: StockAdjustmentLineRequest[];
};

export type CreateStockCountUpdateRequest = {
  storeId: string;
  updateDate: string;
  clientTransactionId: string;
  description: string | null;
  lines: { variantId: string; countedQuantity: number }[];
};

export type VoidStockAdjustmentRequest = { reason: string; clientTransactionId: string };

export type StockAdjustmentLineResponse = {
  lineNumber: number;
  variantId: string;
  barcode: string;
  productName: string;
  unitName: string | null;
  sizeCode: string;
  expectedQuantity: number | null;
  countedQuantity: number | null;
  quantity: number;
  unitCostAmount: number;
  reasonText: string | null;
};

export type StockAdjustmentResponse = {
  id: string;
  storeId: string;
  storeName: string;
  documentNumber: number;
  adjustmentDate: string;
  statusCode: InventoryDocumentStatusCode;
  kindCode: StockAdjustmentKindCode;
  description: string | null;
  reversesDocumentId: string | null;
  createdByName: string | null;
  postedAt: string | null;
  addedQuantity: number;
  removedQuantity: number;
  netValueAmount: number;
  lines: StockAdjustmentLineResponse[];
};

export type VoidStockAdjustmentResponse = { original: StockAdjustmentResponse; reversal: StockAdjustmentResponse };

export type StockAdjustmentListItemResponse = {
  id: string;
  storeId: string;
  storeName: string;
  documentNumber: number;
  adjustmentDate: string;
  statusCode: InventoryDocumentStatusCode;
  kindCode: StockAdjustmentKindCode;
  description: string | null;
  lineCount: number;
  addedQuantity: number;
  removedQuantity: number;
  netValueAmount: number;
};

export type StockCountFilePreviewResponse = {
  rows: { variantId: string; barcode: string; productName: string; sizeCode: string; bookQuantity: number; countedQuantity: number }[];
  problems: { rowNumber: number; barcode: string; message: string }[];
};

// ---- stock audit

export type StockAuditLineResponse = {
  variantId: string;
  barcode: string;
  productName: string;
  categoryName: string | null;
  brandName: string | null;
  genderName: string | null;
  seasonName: string | null;
  sizeCode: string;
  expectedQuantity: number;
  countedQuantity: number;
  differenceQuantity: number;
  purchasePriceAmount: number;
  salePriceAmount: number;
  differenceAmount: number;
  wasScanned: boolean;
};

export type StockAuditSummaryResponse = {
  countedItemCount: number;
  moreItemCount: number;
  lessItemCount: number;
  matchedItemCount: number;
  differenceAmount: number;
};

export type StockAuditResponse = {
  id: string;
  storeId: string;
  storeName: string;
  documentNumber: number;
  auditDate: string;
  statusCode: InventoryDocumentStatusCode;
  note: string | null;
  includesUnscannedItems: boolean;
  postedAt: string | null;
  summary: StockAuditSummaryResponse;
  lines: StockAuditLineResponse[];
};

export type StockAuditListItemResponse = {
  id: string;
  storeId: string;
  storeName: string;
  documentNumber: number;
  auditDate: string;
  statusCode: InventoryDocumentStatusCode;
  note: string | null;
  scannedPieceCount: number;
  scannedItemCount: number;
};

export type StockAuditScanResultResponse = { variantId: string; productName: string; sizeCode: string; countedQuantity: number; wasAlreadyRecorded: boolean };

// ---- product claim

export type CreateProductClaimRequest = {
  storeId: string;
  claimDate: string;
  clientTransactionId: string;
  variantId: string;
  quantity: number;
  reasonCode: ProductClaimReasonCode;
  note: string | null;
};

export type ProductClaimResponse = {
  id: string;
  storeId: string;
  storeName: string;
  claimNumber: number;
  claimDate: string;
  variantId: string;
  barcode: string;
  productName: string;
  sizeCode: string;
  brandName: string | null;
  genderName: string | null;
  seasonName: string | null;
  quantity: number;
  purchasePriceAmount: number;
  reasonCode: ProductClaimReasonCode;
  note: string | null;
  statusCode: ProductClaimStatusCode;
  requestedByName: string | null;
  requestedAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
  rejectReason: string | null;
};

export type ProductClaimReportResponse = { rows: ProductClaimResponse[]; totalQuantity: number; totalValueAmount: number };

// ---- stock transfer

export type StockTransferLineResponse = {
  lineId: string;
  variantId: string;
  barcode: string;
  productName: string;
  sizeCode: string;
  quantityScanned: number;
  quantityShipped: number;
  quantityReceived: number;
  quantityMissing: number;
  unitCostAmount: number;
};

export type TransferLossCaseResponse = {
  id: string;
  transferId: string;
  transferNumber: number;
  fromStoreId: string;
  fromStoreName: string;
  toStoreId: string;
  toStoreName: string;
  variantId: string;
  barcode: string;
  productName: string;
  sizeCode: string;
  quantity: number;
  reason: string | null;
  bearerCode: TransferLossBearerCode | null;
  statusCode: TransferLossCaseStatusCode;
  raisedAt: string;
};

export type StockTransferResponse = {
  id: string;
  transferNumber: number;
  fromStoreId: string;
  fromStoreName: string;
  toStoreId: string;
  toStoreName: string;
  statusCode: StockTransferStatusCode;
  note: string | null;
  createdByName: string | null;
  createdAt: string;
  shippedAt: string | null;
  closedAt: string | null;
  quantityScanned: number;
  quantityShipped: number;
  quantityReceived: number;
  quantityMissing: number;
  lines: StockTransferLineResponse[];
  lossCases: TransferLossCaseResponse[];
};

export type StockTransferListItemResponse = Omit<StockTransferResponse, "note" | "createdByName" | "lines" | "lossCases">;

export type TransferScanResultResponse = { variantId: string; productName: string; sizeCode: string; quantityScanned: number; quantityReceived: number; wasAlreadyRecorded: boolean };

export type CreateStockTransferRequest = { fromStoreId: string; toStoreId: string; clientTransactionId: string; note: string | null };

export type RecordTransferScanRequest = { barcode: string; quantity: number; scanBatchId: string };

export type CreateMultiStockTransferRequest = {
  fromStoreId: string;
  note: string | null;
  dispatch: boolean;
  destinations: { toStoreId: string; clientTransactionId: string; lines: { barcode: string; quantity: number }[] }[];
};

export type CreateMultiStockTransferResponse = { transfers: StockTransferResponse[] };

export type DecideTransferLossRequest = { decisionCode: TransferLossDecisionCode; bearerCode: TransferLossBearerCode | null };

// ---- reports and reconciliation

export type StockAdjustmentReportResponse = {
  rows: {
    storeName: string;
    documentNumber: number;
    adjustmentDate: string;
    kindCode: StockAdjustmentKindCode;
    barcode: string;
    productName: string;
    sizeCode: string;
    addedQuantity: number;
    removedQuantity: number;
    unitCostAmount: number;
    valueAmount: number;
  }[];
  totalAddedQuantity: number;
  totalRemovedQuantity: number;
  netValueAmount: number;
};

export type StockTransferReportResponse = {
  rows: {
    transferId: string;
    transferNumber: number;
    fromStoreName: string;
    toStoreName: string;
    statusCode: StockTransferStatusCode;
    createdAt: string;
    barcode: string;
    productName: string;
    sizeCode: string;
    quantityShipped: number;
    quantityReceived: number;
    quantityMissing: number;
    valueAmount: number;
  }[];
  totalQuantityShipped: number;
  totalQuantityReceived: number;
  totalQuantityMissing: number;
  totalValueAmount: number;
};

export type StockTransferSummaryResponse = {
  rows: {
    fromStoreName: string;
    toStoreName: string;
    transferCount: number;
    quantityShipped: number;
    quantityReceived: number;
    quantityMissing: number;
    valueAmount: number;
  }[];
  totalTransferCount: number;
  totalQuantityShipped: number;
  totalQuantityReceived: number;
  totalQuantityMissing: number;
  totalValueAmount: number;
};

export type StockReconciliationResponse = {
  checkedAt: string;
  storeId: string | null;
  checkedSizeCount: number;
  negativeBalanceCount: number;
  mismatches: {
    storeId: string;
    storeName: string;
    variantId: string;
    barcode: string;
    productName: string;
    sizeCode: string;
    balanceQuantity: number;
    ledgerQuantity: number;
    differenceQuantity: number;
  }[];
  transfersInTransitCount: number;
  piecesInTransitQuantity: number;
  openLossCaseCount: number;
  stockValueAmount: number;
  isClean: boolean;
};

export type CreateStockAuditRequest = { storeId: string; auditDate: string; clientTransactionId: string; note: string | null };

export type ApproveProductClaimsResponse = { approvedCount: number };
