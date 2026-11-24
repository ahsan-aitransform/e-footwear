import { describe, expect, it } from "vitest";
import { buildMultiTransferRequest, findMultiTransferProblem, parseCellQuantity, type MultiTransferMatrix } from "./multiTransferRequest";

const matrix = (overrides: Partial<MultiTransferMatrix> = {}): MultiTransferMatrix => ({
  items: [{ variantId: "v1", barcode: "1S42", productName: "Gents Sandal", sizeCode: "42", stockQuantity: 10 }],
  cellText: { v1: { s2: "3", s3: "5" } },
  destinationStoreIds: ["s2", "s3"],
  ...overrides,
});

describe("the matrix of a multi-store transfer", () => {
  it("reads a cell as whole pieces; empty is zero and anything else is invalid", () => {
    expect(parseCellQuantity(undefined)).toBe(0);
    expect(parseCellQuantity("  ")).toBe(0);
    expect(parseCellQuantity("12")).toBe(12);
    expect(parseCellQuantity("1.5")).toBeNull();
    expect(parseCellQuantity("-2")).toBeNull();
    expect(parseCellQuantity("abc")).toBeNull();
  });

  it("accepts quantities that fit in the stock and names the item that does not", () => {
    expect(findMultiTransferProblem(matrix())).toBeUndefined();
    expect(findMultiTransferProblem(matrix({ cellText: { v1: { s2: "6", s3: "5" } } }))).toEqual({ kind: "moreThanInStock", productName: "Gents Sandal" });
    expect(findMultiTransferProblem(matrix({ cellText: { v1: { s2: "x" } } }))).toEqual({ kind: "invalidQuantity", productName: "Gents Sandal" });
    expect(findMultiTransferProblem(matrix({ cellText: {} }))).toEqual({ kind: "nothingToSend" });
  });

  it("builds one destination per store that gets pieces, with the same transaction id for the same store every time", () => {
    const ids: Record<string, string> = { s2: "tx-2", s3: "tx-3" };

    const request = buildMultiTransferRequest(matrix({ cellText: { v1: { s2: "3" } } }), "s1", "Eid stock", true, (storeId) => ids[storeId]);
    const again = buildMultiTransferRequest(matrix({ cellText: { v1: { s2: "3" } } }), "s1", "Eid stock", true, (storeId) => ids[storeId]);

    expect(request).toEqual({
      fromStoreId: "s1",
      note: "Eid stock",
      dispatch: true,
      destinations: [{ toStoreId: "s2", clientTransactionId: "tx-2", lines: [{ barcode: "1S42", quantity: 3 }] }],
    });
    expect(again).toEqual(request);
  });

  it("splits a quantity above 200 into several lines of at most 200 pieces", () => {
    const big = matrix({ items: [{ variantId: "v1", barcode: "1S42", productName: "Gents Sandal", sizeCode: "42", stockQuantity: 1_000 }], cellText: { v1: { s2: "450" } } });

    const request = buildMultiTransferRequest(big, "s1", null, false, () => "tx");

    expect(request.destinations[0].lines).toEqual([
      { barcode: "1S42", quantity: 200 },
      { barcode: "1S42", quantity: 200 },
      { barcode: "1S42", quantity: 50 },
    ]);
  });
});
