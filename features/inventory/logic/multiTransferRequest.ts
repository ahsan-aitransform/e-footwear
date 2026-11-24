// The matrix of Stock Transfer Multi (docx 5.10): one row per item, one column per receiving store, a quantity in each cell. This turns the matrix into the request:
// one destination per store that gets at least one piece, and one line per item (a line holds at most 200 pieces, so a bigger cell becomes several lines).
import type { CreateMultiStockTransferRequest } from "../types/inventoryTypes";

export const MAXIMUM_PIECES_PER_TRANSFER_LINE = 200;
export const MAXIMUM_DESTINATIONS_PER_MULTI_TRANSFER = 20;

export type MultiTransferMatrixItem = { variantId: string; barcode: string; productName: string; sizeCode: string; stockQuantity: number };
export type MultiTransferMatrix = {
  items: readonly MultiTransferMatrixItem[];
  // The quantity typed in each cell, by variant id and then by store id.
  cellText: Readonly<Record<string, Readonly<Record<string, string>>>>;
  destinationStoreIds: readonly string[];
};

export type MultiTransferProblem = { kind: "nothingToSend" | "invalidQuantity" | "moreThanInStock" | "tooManyDestinations"; productName?: string };

export function parseCellQuantity(text: string | undefined): number | null {
  if (text === undefined || text.trim() === "") return 0;
  return /^\d{1,6}$/.test(text.trim()) ? Number(text.trim()) : null;
}

export function findMultiTransferProblem(matrix: MultiTransferMatrix): MultiTransferProblem | undefined {
  if (matrix.destinationStoreIds.length > MAXIMUM_DESTINATIONS_PER_MULTI_TRANSFER) return { kind: "tooManyDestinations" };
  let totalPieces = 0;
  for (const item of matrix.items) {
    let itemTotal = 0;
    for (const storeId of matrix.destinationStoreIds) {
      const quantity = parseCellQuantity(matrix.cellText[item.variantId]?.[storeId]);
      if (quantity === null) return { kind: "invalidQuantity", productName: item.productName };
      itemTotal += quantity;
    }
    if (itemTotal > item.stockQuantity) return { kind: "moreThanInStock", productName: item.productName };
    totalPieces += itemTotal;
  }
  return totalPieces === 0 ? { kind: "nothingToSend" } : undefined;
}

export function buildMultiTransferRequest(
  matrix: MultiTransferMatrix,
  fromStoreId: string,
  note: string | null,
  shouldDispatch: boolean,
  transactionIdForStore: (storeId: string) => string,
): CreateMultiStockTransferRequest {
  const destinations = matrix.destinationStoreIds
    .map((storeId) => {
      const lines = matrix.items.flatMap((item) => {
        const quantity = parseCellQuantity(matrix.cellText[item.variantId]?.[storeId]) ?? 0;
        const chunks: { barcode: string; quantity: number }[] = [];
        for (let remaining = quantity; remaining > 0; remaining -= MAXIMUM_PIECES_PER_TRANSFER_LINE) {
          chunks.push({ barcode: item.barcode, quantity: Math.min(remaining, MAXIMUM_PIECES_PER_TRANSFER_LINE) });
        }
        return chunks;
      });
      return { toStoreId: storeId, clientTransactionId: transactionIdForStore(storeId), lines };
    })
    .filter((destination) => destination.lines.length > 0);
  return { fromStoreId, note, dispatch: shouldDispatch, destinations };
}
