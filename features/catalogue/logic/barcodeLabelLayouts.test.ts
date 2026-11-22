import { describe, expect, it } from "vitest";
import type { BarcodeLabelResponse } from "../types/catalogueTypes";
import { checkLabelRequest, expandLabelCopies, findBarcodeLabelLayout } from "./barcodeLabelLayouts";

function label(copies: number, barcode = "B1"): BarcodeLabelResponse {
  return { variantId: barcode, barcode, productCode: "P1", productName: "Sandal", productNameUrdu: null, sizeCode: "27", colorName: null, brandName: null, salePrice: 999, copies };
}

describe("barcode label layouts", () => {
  it("repeats each label for its copies, in order", () => {
    expect(expandLabelCopies([label(2, "A"), label(1, "B")]).map((item) => item.barcode)).toEqual(["A", "A", "B"]);
  });

  it("falls back to the first layout for an unknown code", () => {
    expect(findBarcodeLabelLayout("40x30").heightMillimetres).toBe(30);
    expect(findBarcodeLabelLayout("nope").code).toBe("50x25");
  });

  it("checks the request like the server does", () => {
    expect(checkLabelRequest([])).toBe("noSizes");
    expect(checkLabelRequest([{ copies: 0 }])).toBe("copiesOutOfRange");
    expect(checkLabelRequest([{ copies: null }])).toBe("copiesOutOfRange");
    expect(checkLabelRequest([{ copies: 1001 }])).toBe("copiesOutOfRange");
    expect(checkLabelRequest([{ copies: 1000 }, { copies: 1000 }, { copies: 1000 }, { copies: 1000 }, { copies: 1000 }, { copies: 1 }])).toBe("tooManyLabels");
    expect(checkLabelRequest([{ copies: 2 }, { copies: 3 }])).toBeNull();
  });
});
