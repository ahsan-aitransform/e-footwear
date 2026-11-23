import { describe, expect, it } from "vitest";
import {
  addReturnableInvoice,
  calculateReturnTotal,
  findReturnProblems,
  toReturnedLineRequests,
  type ReturnSelections,
} from "./saleReturnSelections";
import type { ReturnableInvoiceResponse, ReturnableSaleLineResponse } from "../types/saleTypes";

function line(overrides: Partial<ReturnableSaleLineResponse> = {}): ReturnableSaleLineResponse {
  return {
    lineId: "line-1",
    lineNumber: 1,
    invoiceId: "invoice-1",
    invoiceNumber: 7,
    variantId: "variant-1",
    productCode: "P-1",
    productName: "Gents Sandal",
    productNameUrdu: null,
    unitName: "Pair",
    sizeCode: "42",
    barcode: "8901",
    soldQuantity: 3,
    alreadyReturnedQuantity: 1,
    returnableQuantity: 2,
    listPrice: 1000,
    unitPrice: 900,
    discountPerUnit: 100,
    discountPercent: 10,
    ...overrides,
  };
}

function invoice(lines: ReturnableSaleLineResponse[], invoiceId = "invoice-1"): ReturnableInvoiceResponse {
  return { invoiceId, invoiceNumber: 7, storeId: "store-1", saleDate: "2026-11-10", customerPartyId: null, customerName: null, walkInCustomerName: null, lines };
}

const chosen = (quantity: number): ReturnSelections => ({ "line-1": { quantity, reasonText: " Too tight ", itemConditionCode: "SELLABLE" } });

describe("return limits", () => {
  it("asks for something to be chosen", () => {
    expect(findReturnProblems([invoice([line()])], {}).map((problem) => problem.messageKey)).toEqual(["sales.return.problem.nothingChosen"]);
  });

  it("accepts up to the returnable quantity and refuses more", () => {
    expect(findReturnProblems([invoice([line()])], chosen(2))).toEqual([]);
    expect(findReturnProblems([invoice([line()])], chosen(3))).toEqual([{ messageKey: "sales.return.problem.moreThanReturnable", lineId: "line-1" }]);
  });

  it("allows a partial quantity with decimals up to the limit", () => {
    expect(findReturnProblems([invoice([line({ returnableQuantity: 1.5 })])], chosen(1.5))).toEqual([]);
    expect(findReturnProblems([invoice([line({ returnableQuantity: 1.5 })])], chosen(1.501))).toHaveLength(1);
  });

  it("ignores lines with no quantity", () => {
    const lines = [line(), line({ lineId: "line-2", variantId: "variant-2" })];
    expect(toReturnedLineRequests([invoice(lines)], chosen(1)).map((request) => request.originalLineId)).toEqual(["line-1"]);
  });
});

describe("return value and request", () => {
  it("values the return at the price the customer paid", () => {
    expect(calculateReturnTotal([invoice([line()])], chosen(2), "FLOOR")).toBe(1800);
  });

  it("builds the request with the trimmed reason and the condition", () => {
    expect(toReturnedLineRequests([invoice([line()])], chosen(1))).toEqual([
      { originalLineId: "line-1", quantity: 1, reasonText: "Too tight", itemConditionCode: "SELLABLE" },
    ]);
  });

  it("does not list an invoice twice when it is found again", () => {
    const first = invoice([line()]);
    expect(addReturnableInvoice([first], invoice([line({ returnableQuantity: 1 })]))).toHaveLength(1);
    expect(addReturnableInvoice([first], invoice([line({ lineId: "other" })], "invoice-2"))).toHaveLength(2);
  });
});
