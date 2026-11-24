import { describe, expect, it } from "vitest";
import type { InventoryItemResponse } from "../types/inventoryTypes";
import {
  AdjustmentDirections,
  addItemToLines,
  findAdjustmentProblems,
  summariseAdjustment,
  toAdjustmentLineRequests,
  toSignedQuantity,
  type AdjustmentEntryLine,
} from "./stockAdjustmentLines";

const sandal: InventoryItemResponse = {
  variantId: "v1",
  productCode: "P1",
  productName: "Gents Sandal",
  productNameUrdu: null,
  unitName: "Pair",
  sizeCode: "42",
  colorName: null,
  barcode: "1S42",
  stockQuantity: 10,
  purchasePriceAmount: 400,
};

describe("the lines of a stock adjustment", () => {
  it("starts a line with one piece and adds a piece each time the same item is chosen again", () => {
    const once = addItemToLines([], sandal, AdjustmentDirections.add);
    const twice = addItemToLines(once, sandal, AdjustmentDirections.remove);

    expect(once).toHaveLength(1);
    expect(once[0]).toMatchObject({ quantity: 1, quantityText: "1", unitCostAmount: 400, direction: "ADD" });
    expect(twice).toHaveLength(1);
    expect(twice[0]).toMatchObject({ quantity: 2, quantityText: "2", direction: "ADD" });
  });

  it("sends a removal as a negative quantity and an addition as a positive one", () => {
    const line: AdjustmentEntryLine = { ...addItemToLines([], sandal, AdjustmentDirections.remove)[0], quantity: 3 };

    expect(toSignedQuantity(line)).toBe(-3);
    expect(toAdjustmentLineRequests([line])).toEqual([{ variantId: "v1", quantity: -3, unitCostAmount: 400, reasonText: null }]);
    expect(toSignedQuantity({ ...line, direction: AdjustmentDirections.add })).toBe(3);
  });

  it("finds a missing quantity, a removal of more than is in stock, and too many lines", () => {
    const base = addItemToLines([], sandal, AdjustmentDirections.remove)[0];

    expect(findAdjustmentProblems([{ ...base, quantity: null }])).toEqual([{ lineNumber: 1, kind: "quantityMissing" }]);
    expect(findAdjustmentProblems([{ ...base, quantity: 0 }])).toEqual([{ lineNumber: 1, kind: "quantityMissing" }]);
    expect(findAdjustmentProblems([{ ...base, quantity: 11 }])).toEqual([{ lineNumber: 1, kind: "moreThanInStock" }]);
    expect(findAdjustmentProblems([{ ...base, quantity: 10 }])).toEqual([]);
    expect(findAdjustmentProblems([{ ...base, direction: AdjustmentDirections.add, quantity: 500 }])).toEqual([]);
    expect(findAdjustmentProblems(Array.from({ length: 501 }, () => ({ ...base, quantity: 1 })))).toContainEqual({ lineNumber: 501, kind: "tooManyLines" });
  });

  it("totals the pieces added and removed and the net value in whole rupees", () => {
    const added = { ...addItemToLines([], sandal, AdjustmentDirections.add)[0], quantity: 5 };
    const removed: AdjustmentEntryLine = { ...added, variantId: "v2", direction: AdjustmentDirections.remove, quantity: 2, unitCostAmount: 150 };

    expect(summariseAdjustment([added, removed])).toEqual({ addedQuantity: 5, removedQuantity: 2, netValueAmount: 2_000 - 300 });
  });
});
