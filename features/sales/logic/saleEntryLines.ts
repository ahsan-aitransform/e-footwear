// The lines of a sale being typed, as a pure reducer (tested without a screen). A barcode scanned twice adds one to the quantity of the same line
// as long as that line has no manual change; anything else becomes its own line, so the cashier sees exactly what will be posted.
import type { RoundingMode } from "@/lib/constants/moneyFormat";
import { calculateSaleLineAmounts, type SaleLineCalculationInput } from "./saleCalculations";
import { SaleLineDiscountTypeCodes, type SaleItemResponse, type SaleLineDiscountTypeCode, type SaleLineRequest } from "../types/saleTypes";

export type SaleEntryLine = {
  lineKey: string;
  item: SaleItemResponse;
  quantity: number;
  // The price on the line before the manual discount. Starts as the suggested price of the item (promotion included).
  unitPrice: number;
  discountTypeCode: SaleLineDiscountTypeCode;
  discountValue: number | null;
};

export type SaleEntryLinesAction =
  | {
      type: "itemAdded";
      item: SaleItemResponse;
      quantity: number;
      lineKey: string;
      // The price and discount typed in the item entry panel; when left out, the item is added at its suggested price without a discount.
      unitPrice?: number;
      discountTypeCode?: SaleLineDiscountTypeCode;
      discountValue?: number | null;
    }
  | { type: "quantityChanged"; lineKey: string; quantity: number }
  | { type: "unitPriceChanged"; lineKey: string; unitPrice: number }
  | { type: "discountChanged"; lineKey: string; discountTypeCode: SaleLineDiscountTypeCode; discountValue: number | null }
  | { type: "lineRemoved"; lineKey: string }
  | { type: "linesReplaced"; lines: SaleEntryLine[] }
  | { type: "cleared" };

export function saleEntryLinesReducer(lines: SaleEntryLine[], action: SaleEntryLinesAction): SaleEntryLine[] {
  switch (action.type) {
    case "itemAdded": {
      const unitPrice = action.unitPrice ?? action.item.suggestedUnitPrice;
      const discountTypeCode = action.discountTypeCode ?? SaleLineDiscountTypeCodes.none;
      const discountValue = discountTypeCode === SaleLineDiscountTypeCodes.none ? null : (action.discountValue ?? null);
      // The same item at the same price and discount is one line with a larger quantity; any difference makes it a line of its own.
      const existing = lines.find(
        (line) =>
          line.item.variantId === action.item.variantId &&
          line.unitPrice === unitPrice &&
          line.discountTypeCode === discountTypeCode &&
          line.discountValue === discountValue,
      );
      if (existing) {
        return lines.map((line) => (line.lineKey === existing.lineKey ? { ...line, quantity: roundQuantity(line.quantity + action.quantity) } : line));
      }
      return [...lines, { lineKey: action.lineKey, item: action.item, quantity: action.quantity, unitPrice, discountTypeCode, discountValue }];
    }
    case "quantityChanged":
      return lines.map((line) => (line.lineKey === action.lineKey ? { ...line, quantity: action.quantity } : line));
    case "unitPriceChanged":
      return lines.map((line) => (line.lineKey === action.lineKey ? { ...line, unitPrice: action.unitPrice } : line));
    case "discountChanged":
      return lines.map((line) =>
        line.lineKey === action.lineKey ? { ...line, discountTypeCode: action.discountTypeCode, discountValue: action.discountValue } : line,
      );
    case "lineRemoved":
      return lines.filter((line) => line.lineKey !== action.lineKey);
    case "linesReplaced":
      return action.lines;
    case "cleared":
      return [];
  }
}

// 0.1 + 0.2 must not become 0.30000000000000004 on a receipt: quantities live in thousandths.
function roundQuantity(quantity: number): number {
  return Math.round(quantity * 1000) / 1000;
}

export function toCalculationInput(line: SaleEntryLine): SaleLineCalculationInput {
  return {
    quantity: line.quantity,
    listPrice: line.item.listPrice,
    unitPrice: line.unitPrice,
    discountTypeCode: line.discountTypeCode,
    discountValue: line.discountValue,
  };
}

export function calculateEntryLine(line: SaleEntryLine, roundingMode: RoundingMode) {
  return calculateSaleLineAmounts(toCalculationInput(line), roundingMode);
}

export function toSaleLineRequests(lines: readonly SaleEntryLine[]): SaleLineRequest[] {
  return lines.map((line) => ({
    variantId: line.item.variantId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discountTypeCode: line.discountTypeCode === SaleLineDiscountTypeCodes.none ? null : line.discountTypeCode,
    discountValue: line.discountTypeCode === SaleLineDiscountTypeCodes.none ? null : line.discountValue,
  }));
}

export type SaleEntryProblem = { messageKey: string; lineKey?: string; params?: Record<string, string | number> };

// What the screen can know before it asks the server. The server checks all of it again (and the stock, the permissions and the tax rule).
export function findSaleEntryProblems(
  lines: readonly SaleEntryLine[],
  options: { maximumManualDiscountPercentage: number | null; hasCustomer: boolean; outstandingAmount: number },
): SaleEntryProblem[] {
  const problems: SaleEntryProblem[] = [];
  if (lines.length === 0) problems.push({ messageKey: "sales.problem.noLines" });
  for (const line of lines) {
    if (!(line.quantity > 0)) problems.push({ messageKey: "sales.problem.quantity", lineKey: line.lineKey });
    if (line.unitPrice < 0) problems.push({ messageKey: "sales.problem.price", lineKey: line.lineKey });
    if (line.unitPrice > line.item.listPrice) problems.push({ messageKey: "sales.problem.priceAboveShelf", lineKey: line.lineKey, params: { price: line.item.listPrice } });
    if (line.discountTypeCode !== SaleLineDiscountTypeCodes.none) {
      if (line.discountValue === null || line.discountValue <= 0) problems.push({ messageKey: "sales.problem.discountMissing", lineKey: line.lineKey });
      else if (line.discountTypeCode === SaleLineDiscountTypeCodes.percent && line.discountValue > 100) problems.push({ messageKey: "sales.problem.discountPercent", lineKey: line.lineKey });
      else if (
        line.discountTypeCode === SaleLineDiscountTypeCodes.percent &&
        options.maximumManualDiscountPercentage !== null &&
        line.discountValue > options.maximumManualDiscountPercentage
      ) {
        problems.push({ messageKey: "sales.problem.discountAboveCompanyMaximum", lineKey: line.lineKey, params: { maximum: options.maximumManualDiscountPercentage } });
      }
    }
    if (line.quantity > line.item.stockQuantity) {
      problems.push({ messageKey: "sales.problem.stock", lineKey: line.lineKey, params: { stock: line.item.stockQuantity } });
    }
  }
  if (options.outstandingAmount > 0 && !options.hasCustomer) problems.push({ messageKey: "sales.problem.creditNeedsCustomer" });
  return problems;
}
