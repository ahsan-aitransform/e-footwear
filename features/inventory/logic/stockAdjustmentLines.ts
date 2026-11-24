// The lines of the Stock Adjustment screen (docx 5.7) as the person edits them, and the conversion to the request. Pure, so the rules are tested without a screen.
// A line carries a positive quantity and a direction (add or remove); the request carries one signed quantity. Money is whole rupees.
import { RoundingModes } from "@/lib/constants/moneyFormat";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { multiplyWholeRupeesByQuantity, sumWholeRupees } from "@/lib/money/wholeRupeeAmount";
import type { InventoryItemResponse, StockAdjustmentLineRequest } from "../types/inventoryTypes";

export const AdjustmentDirections = { add: "ADD", remove: "REMOVE" } as const;
export type AdjustmentDirection = (typeof AdjustmentDirections)[keyof typeof AdjustmentDirections];

export const MAXIMUM_ADJUSTMENT_LINES = 500;
export const MAXIMUM_ADJUSTMENT_QUANTITY = 999_999;

export type AdjustmentEntryLine = {
  variantId: string;
  barcode: string;
  productName: string;
  sizeCode: string;
  unitName: string | null;
  stockQuantity: number;
  direction: AdjustmentDirection;
  // Typed by the person: kept as text so "1." and an empty field are possible while typing; null = not a valid quantity (yet).
  quantityText: string;
  quantity: number | null;
  unitCostAmount: number;
};

export type AdjustmentProblem = { lineNumber: number; kind: "quantityMissing" | "quantityTooLarge" | "moreThanInStock" | "tooManyLines" };

// An item chosen again adds one more piece to its line (a scanner scans a pile one piece at a time); a new item starts a new line with one piece.
export function addItemToLines(lines: readonly AdjustmentEntryLine[], item: InventoryItemResponse, direction: AdjustmentDirection): AdjustmentEntryLine[] {
  const existingIndex = lines.findIndex((line) => line.variantId === item.variantId);
  if (existingIndex >= 0) {
    return lines.map((line, index) => {
      if (index !== existingIndex) return line;
      const quantity = (line.quantity ?? 0) + 1;
      return { ...line, quantity, quantityText: formatQuantity(quantity), stockQuantity: item.stockQuantity };
    });
  }
  return [
    ...lines,
    {
      variantId: item.variantId,
      barcode: item.barcode,
      productName: item.productName,
      sizeCode: item.sizeCode,
      unitName: item.unitName,
      stockQuantity: item.stockQuantity,
      direction,
      quantityText: "1",
      quantity: 1,
      unitCostAmount: item.purchasePriceAmount,
    },
  ];
}

export function toSignedQuantity(line: AdjustmentEntryLine): number {
  const quantity = line.quantity ?? 0;
  return line.direction === AdjustmentDirections.remove ? -quantity : quantity;
}

export function findAdjustmentProblems(lines: readonly AdjustmentEntryLine[]): AdjustmentProblem[] {
  const problems: AdjustmentProblem[] = [];
  if (lines.length > MAXIMUM_ADJUSTMENT_LINES) problems.push({ lineNumber: MAXIMUM_ADJUSTMENT_LINES + 1, kind: "tooManyLines" });
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.quantity === null || line.quantity <= 0) problems.push({ lineNumber, kind: "quantityMissing" });
    else if (line.quantity > MAXIMUM_ADJUSTMENT_QUANTITY) problems.push({ lineNumber, kind: "quantityTooLarge" });
    // The stock shown is what the screen last saw; the server checks again under a lock, so this only saves a round trip.
    else if (line.direction === AdjustmentDirections.remove && line.quantity > line.stockQuantity) problems.push({ lineNumber, kind: "moreThanInStock" });
  });
  return problems;
}

export function lineTotalAmount(line: AdjustmentEntryLine): number {
  return multiplyWholeRupeesByQuantity(line.unitCostAmount, line.quantity ?? 0, RoundingModes.nearest);
}

export function summariseAdjustment(lines: readonly AdjustmentEntryLine[]): { addedQuantity: number; removedQuantity: number; netValueAmount: number } {
  const added = lines.filter((line) => line.direction === AdjustmentDirections.add).reduce((sum, line) => sum + (line.quantity ?? 0), 0);
  const removed = lines.filter((line) => line.direction === AdjustmentDirections.remove).reduce((sum, line) => sum + (line.quantity ?? 0), 0);
  const netValueAmount = sumWholeRupees(lines.map((line) => (line.direction === AdjustmentDirections.remove ? -lineTotalAmount(line) : lineTotalAmount(line))));
  return { addedQuantity: added, removedQuantity: removed, netValueAmount };
}

export function toAdjustmentLineRequests(lines: readonly AdjustmentEntryLine[]): StockAdjustmentLineRequest[] {
  return lines.map((line) => ({ variantId: line.variantId, quantity: toSignedQuantity(line), unitCostAmount: line.unitCostAmount, reasonText: null }));
}
