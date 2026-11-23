import { beforeEach, describe, expect, it } from "vitest";
import { resetIndexedKeyValueStoreForTests } from "@/lib/storage/indexedKeyValueStore";
import { findSaleEntryProblems, saleEntryLinesReducer, toSaleLineRequests, type SaleEntryLine } from "./saleEntryLines";
import { discardSalesDraft, loadSalesDraft, saveSalesDraft, SalesDraftScreenCodes } from "./saleEntryDraftStorage";
import { interpretSalesShortcut } from "./salesKeyboardShortcuts";
import { SaleLineDiscountTypeCodes, type SaleItemResponse } from "../types/saleTypes";

function item(overrides: Partial<SaleItemResponse> = {}): SaleItemResponse {
  return {
    variantId: "variant-1",
    productId: "product-1",
    productCode: "P-1",
    productName: "Gents Sandal",
    productNameUrdu: null,
    unitName: "Pair",
    sizeCode: "42",
    colorName: null,
    barcode: "8901",
    stockQuantity: 10,
    listPrice: 1000,
    suggestedUnitPrice: 1000,
    promotionDiscountPerUnit: 0,
    hasPromotionConflict: false,
    taxRatePercentage: 0,
    hasPicture: false,
    ...overrides,
  };
}

const noProblemOptions = { maximumManualDiscountPercentage: null, hasCustomer: false, outstandingAmount: 0 };

describe("scanning items into the grid", () => {
  it("adds a new line at the suggested price", () => {
    const lines = saleEntryLinesReducer([], { type: "itemAdded", item: item({ suggestedUnitPrice: 900 }), quantity: 1, lineKey: "a" });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ quantity: 1, unitPrice: 900, discountTypeCode: SaleLineDiscountTypeCodes.none });
  });

  it("scanning the same barcode again adds one to the quantity", () => {
    let lines = saleEntryLinesReducer([], { type: "itemAdded", item: item(), quantity: 1, lineKey: "a" });
    lines = saleEntryLinesReducer(lines, { type: "itemAdded", item: item(), quantity: 1, lineKey: "b" });
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
  });

  it("keeps a line with a manual discount separate from a plain scan", () => {
    let lines = saleEntryLinesReducer([], { type: "itemAdded", item: item(), quantity: 1, lineKey: "a" });
    lines = saleEntryLinesReducer(lines, { type: "discountChanged", lineKey: "a", discountTypeCode: SaleLineDiscountTypeCodes.percent, discountValue: 10 });
    lines = saleEntryLinesReducer(lines, { type: "itemAdded", item: item(), quantity: 1, lineKey: "b" });
    expect(lines.map((line) => line.lineKey)).toEqual(["a", "b"]);
  });

  it("does not drift when fractions are added", () => {
    let lines = saleEntryLinesReducer([], { type: "itemAdded", item: item(), quantity: 0.1, lineKey: "a" });
    lines = saleEntryLinesReducer(lines, { type: "itemAdded", item: item(), quantity: 0.2, lineKey: "b" });
    expect(lines[0].quantity).toBe(0.3);
  });

  it("edits, removes and clears lines", () => {
    let lines = saleEntryLinesReducer([], { type: "itemAdded", item: item(), quantity: 1, lineKey: "a" });
    lines = saleEntryLinesReducer(lines, { type: "quantityChanged", lineKey: "a", quantity: 4 });
    lines = saleEntryLinesReducer(lines, { type: "unitPriceChanged", lineKey: "a", unitPrice: 950 });
    expect(lines[0]).toMatchObject({ quantity: 4, unitPrice: 950 });
    expect(saleEntryLinesReducer(lines, { type: "lineRemoved", lineKey: "a" })).toEqual([]);
    expect(saleEntryLinesReducer(lines, { type: "cleared" })).toEqual([]);
  });

  it("builds the request lines and drops a discount that is not used", () => {
    const lines: SaleEntryLine[] = [
      { lineKey: "a", item: item(), quantity: 2, unitPrice: 1000, discountTypeCode: SaleLineDiscountTypeCodes.none, discountValue: 5 },
      { lineKey: "b", item: item({ variantId: "variant-2" }), quantity: 1, unitPrice: 1000, discountTypeCode: SaleLineDiscountTypeCodes.percent, discountValue: 10 },
    ];
    expect(toSaleLineRequests(lines)).toEqual([
      { variantId: "variant-1", quantity: 2, unitPrice: 1000, discountTypeCode: null, discountValue: null },
      { variantId: "variant-2", quantity: 1, unitPrice: 1000, discountTypeCode: "PERCENT", discountValue: 10 },
    ]);
  });
});

describe("what the screen can check before saving", () => {
  const line = (overrides: Partial<SaleEntryLine> = {}): SaleEntryLine => ({
    lineKey: "a",
    item: item(),
    quantity: 1,
    unitPrice: 1000,
    discountTypeCode: SaleLineDiscountTypeCodes.none,
    discountValue: null,
    ...overrides,
  });

  it("needs at least one line", () => {
    expect(findSaleEntryProblems([], noProblemOptions).map((problem) => problem.messageKey)).toEqual(["sales.problem.noLines"]);
  });

  it("finds nothing wrong with a plain sale", () => {
    expect(findSaleEntryProblems([line()], noProblemOptions)).toEqual([]);
  });

  it("refuses a price above the shelf price, more than the stock and a missing discount value", () => {
    const keys = (lines: SaleEntryLine[]) => findSaleEntryProblems(lines, noProblemOptions).map((problem) => problem.messageKey);
    expect(keys([line({ unitPrice: 1200 })])).toContain("sales.problem.priceAboveShelf");
    expect(keys([line({ quantity: 11 })])).toContain("sales.problem.stock");
    expect(keys([line({ discountTypeCode: SaleLineDiscountTypeCodes.percent, discountValue: null })])).toContain("sales.problem.discountMissing");
    expect(keys([line({ quantity: 0 })])).toContain("sales.problem.quantity");
  });

  it("applies the company maximum for a manual percent discount when there is one", () => {
    const discounted = line({ discountTypeCode: SaleLineDiscountTypeCodes.percent, discountValue: 20 });
    expect(findSaleEntryProblems([discounted], { ...noProblemOptions, maximumManualDiscountPercentage: 15 }).map((problem) => problem.messageKey)).toContain(
      "sales.problem.discountAboveCompanyMaximum",
    );
    expect(findSaleEntryProblems([discounted], noProblemOptions)).toEqual([]);
  });

  it("needs a customer when part of the bill is unpaid", () => {
    expect(findSaleEntryProblems([line()], { ...noProblemOptions, outstandingAmount: 500 }).map((problem) => problem.messageKey)).toContain("sales.problem.creditNeedsCustomer");
    expect(findSaleEntryProblems([line()], { maximumManualDiscountPercentage: null, hasCustomer: true, outstandingAmount: 500 })).toEqual([]);
  });
});

describe("keyboard shortcuts", () => {
  const press = (key: string, modifiers: Partial<{ ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean }> = {}) =>
    interpretSalesShortcut({ key, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...modifiers });

  it("F2 focuses the barcode box and F9 or Ctrl+S saves", () => {
    expect(press("F2")).toBe("focusBarcode");
    expect(press("F9")).toBe("save");
    expect(press("s", { ctrlKey: true })).toBe("save");
    expect(press("S", { ctrlKey: true })).toBe("save");
  });

  it("Alt+1, Alt+2 and Alt+3 open the three screens, because Ctrl+1 to 3 belong to the browser tabs", () => {
    expect(press("1", { altKey: true })).toBe("openNewSale");
    expect(press("2", { altKey: true })).toBe("openSaleReturn");
    expect(press("3", { altKey: true })).toBe("openExchangeInvoice");
    expect(press("1", { ctrlKey: true })).toBeNull();
  });

  it("ignores ordinary typing", () => {
    expect(press("a")).toBeNull();
    expect(press("1")).toBeNull();
    expect(press("s")).toBeNull();
  });
});

describe("the sale being typed is kept in the browser until it is saved", () => {
  const identity = { companyId: "company-1", userId: "user-1", storeId: "store-1", screenCode: SalesDraftScreenCodes.newSale };

  beforeEach(async () => {
    await resetIndexedKeyValueStoreForTests();
  });

  it("restores what was typed and forgets it once discarded", async () => {
    expect(await loadSalesDraft(identity)).toBeUndefined();
    await saveSalesDraft(identity, { lines: [{ lineKey: "a" }], clientTransactionId: "tx-1" });
    expect(await loadSalesDraft(identity)).toEqual({ lines: [{ lineKey: "a" }], clientTransactionId: "tx-1" });
    await discardSalesDraft(identity);
    expect(await loadSalesDraft(identity)).toBeUndefined();
  });

  it("keeps drafts of different stores and screens apart", async () => {
    await saveSalesDraft(identity, { marker: "new sale, store 1" });
    expect(await loadSalesDraft({ ...identity, storeId: "store-2" })).toBeUndefined();
    expect(await loadSalesDraft({ ...identity, screenCode: SalesDraftScreenCodes.exchange })).toBeUndefined();
  });
});
