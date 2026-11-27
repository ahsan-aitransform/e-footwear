import { describe, expect, it } from "vitest";
import {
  buildNumericSizeCodes,
  buildRowsForSizeRange,
  createEmptyProductForm,
  createRowKey,
  hasProductFormErrors,
  toCreateProductRequest,
  toUpdateProductRequest,
  validateProductForm,
  type ProductFormValues,
  type ProductVariantFormRow,
} from "./productFormLogic";

const sizes = ["25", "26", "27", "28", "29"];

function row(overrides: Partial<ProductVariantFormRow> = {}): ProductVariantFormRow {
  return {
    rowKey: createRowKey(), variantId: null, rowVersion: null, colorId: "", sizeGroupId: "", sizeCode: "27", barcode: "",
    purchasePrice: 500, salePrice: 900, status: "ACTIVE", ...overrides,
  };
}

function validForm(overrides: Partial<ProductFormValues> = {}): ProductFormValues {
  return { ...createEmptyProductForm(), name: "Sandal", departmentId: "d", categoryId: "c", variants: [row()], ...overrides };
}

describe("size range of the sizes grid", () => {
  const base = { orderedSizeCodes: sizes, sizeGroupId: "g", colorId: "", purchasePrice: 500, salePrice: 900, existingRows: [] as ProductVariantFormRow[] };

  it("adds every size from start to end in the group order", () => {
    const rows = buildRowsForSizeRange({ ...base, startSizeCode: "26", endSizeCode: "28" });
    expect(rows?.map((added) => added.sizeCode)).toEqual(["26", "27", "28"]);
    expect(rows?.every((added) => added.salePrice === 900 && added.purchasePrice === 500)).toBe(true);
  });

  it("refuses an end before the start or a size that is not in the group", () => {
    expect(buildRowsForSizeRange({ ...base, startSizeCode: "28", endSizeCode: "26" })).toBeNull();
    expect(buildRowsForSizeRange({ ...base, startSizeCode: "26", endSizeCode: "99" })).toBeNull();
  });

  it("skips sizes that are already in the grid for the same colour", () => {
    const rows = buildRowsForSizeRange({ ...base, startSizeCode: "26", endSizeCode: "28", existingRows: [row({ sizeCode: "27" })] });
    expect(rows?.map((added) => added.sizeCode)).toEqual(["26", "28"]);
  });
});

describe("product form validation", () => {
  it("accepts a minimal product with one size", () => {
    expect(hasProductFormErrors(validateProductForm(validForm()))).toBe(false);
  });

  it("asks for a name, department, category and at least one size", () => {
    const { errors } = validateProductForm(createEmptyProductForm());
    expect(errors.name).toBe("catalogue.validation.nameRequired");
    expect(errors.departmentId).toBe("catalogue.validation.departmentRequired");
    expect(errors.categoryId).toBe("catalogue.validation.categoryRequired");
    expect(errors.variants).toBe("catalogue.validation.sizeRequired");
  });

  it("flags a duplicated size, a duplicated barcode and missing prices on the row", () => {
    const first = row({ sizeCode: "27", barcode: "B1" });
    const sameSize = row({ sizeCode: "27" });
    const sameBarcode = row({ sizeCode: "28", barcode: "B1" });
    const noPrice = row({ sizeCode: "29", salePrice: null });
    const { rowErrors } = validateProductForm(validForm({ variants: [first, sameSize, sameBarcode, noPrice] }));
    expect(rowErrors[first.rowKey]).toBeUndefined();
    expect(rowErrors[sameSize.rowKey]).toBe("catalogue.validation.sizeDuplicated");
    expect(rowErrors[sameBarcode.rowKey]).toBe("catalogue.validation.barcodeDuplicated");
    expect(rowErrors[noPrice.rowKey]).toBe("catalogue.validation.priceRequired");
  });

  it("allows the same size in two colours", () => {
    const { rowErrors } = validateProductForm(validForm({ variants: [row({ colorId: "red" }), row({ colorId: "blue" })] }));
    expect(Object.keys(rowErrors)).toHaveLength(0);
  });

  it("rejects a price above the maximum and a barcode with spaces", () => {
    const tooHigh = row({ salePrice: 1_000_000_000 });
    const spaced = row({ sizeCode: "28", barcode: "A B" });
    const { rowErrors } = validateProductForm(validForm({ variants: [tooHigh, spaced] }));
    expect(rowErrors[tooHigh.rowKey]).toBe("catalogue.validation.priceRange");
    expect(rowErrors[spaced.rowKey]).toBe("catalogue.validation.barcodeCharacters");
  });
});

describe("product requests", () => {
  it("turns blank text into null and keeps whole-rupee prices", () => {
    const request = toCreateProductRequest(validForm({ nameUrdu: "  ", brandId: "", description: " " }));
    expect(request.nameUrdu).toBeNull();
    expect(request.brandId).toBeNull();
    expect(request.description).toBeNull();
    expect(request.variants[0]).toMatchObject({ sizeCode: "27", barcode: null, purchasePrice: 500, salePrice: 900 });
  });

  it("sends the row version of the product on update", () => {
    expect(toUpdateProductRequest(validForm(), 7).rowVersion).toBe(7);
  });
});

describe("buildNumericSizeCodes", () => {
  it("lists every whole number from start to end", () => {
    expect(buildNumericSizeCodes("38", "40")).toEqual(["38", "39", "40"]);
  });

  it("gives nothing for a reversed, fractional or oversized range", () => {
    expect(buildNumericSizeCodes("40", "38")).toEqual([]);
    expect(buildNumericSizeCodes("1.5", "3")).toEqual([]);
    expect(buildNumericSizeCodes("1", "1000")).toEqual([]);
  });
});
