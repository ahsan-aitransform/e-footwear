import type { MessageKey } from "@/lib/i18n/messageKeys";
import {
  ProductStatusCodes,
  type CreateProductRequest,
  type ProductDetailResponse,
  type ProductVariantInput,
  type UpdateProductRequest,
} from "../types/catalogueTypes";
import { CatalogueLimits } from "./catalogueLimits";

// One size row of the Sizes grid. rowKey identifies the row on screen; variantId is set for sizes that already exist.
export type ProductVariantFormRow = {
  rowKey: string;
  variantId: string | null;
  rowVersion: number | null;
  colorId: string;
  sizeGroupId: string;
  sizeCode: string;
  // Empty = the server builds the barcode (product code + size).
  barcode: string;
  purchasePrice: number | null;
  salePrice: number | null;
  status: string;
};

export type ProductFormValues = {
  name: string;
  nameUrdu: string;
  departmentId: string;
  categoryId: string;
  brandId: string;
  seasonId: string;
  genderId: string;
  productTypeId: string;
  unitId: string;
  locationId: string;
  weight: number | null;
  description: string;
  taxRate: number | null;
  taxCode: string;
  status: string;
  variants: ProductVariantFormRow[];
};

export type ProductFormField =
  | "name" | "nameUrdu" | "departmentId" | "categoryId" | "weight" | "description" | "taxRate" | "taxCode" | "variants";
export type ProductFormErrors = Partial<Record<ProductFormField, MessageKey>>;
// Errors of single size rows, by rowKey.
export type ProductVariantRowErrors = Record<string, MessageKey>;

let rowKeyCounter = 0;
export function createRowKey(): string {
  rowKeyCounter += 1;
  return `variant-row-${rowKeyCounter}`;
}

export function createEmptyProductForm(): ProductFormValues {
  return {
    name: "", nameUrdu: "", departmentId: "", categoryId: "", brandId: "", seasonId: "", genderId: "", productTypeId: "",
    unitId: "", locationId: "", weight: null, description: "", taxRate: 0, taxCode: "", status: ProductStatusCodes.active, variants: [],
  };
}

export function valuesFromProduct(product: ProductDetailResponse): ProductFormValues {
  return {
    name: product.name,
    nameUrdu: product.nameUrdu ?? "",
    departmentId: product.departmentId,
    categoryId: product.categoryId,
    brandId: product.brandId ?? "",
    seasonId: product.seasonId ?? "",
    genderId: product.genderId ?? "",
    productTypeId: product.productTypeId ?? "",
    unitId: product.unitId ?? "",
    locationId: product.locationId ?? "",
    weight: product.weight,
    description: product.description ?? "",
    taxRate: product.taxRate,
    taxCode: product.taxCode ?? "",
    status: product.status,
    variants: product.variants.map((variant) => ({
      rowKey: createRowKey(),
      variantId: variant.variantId,
      rowVersion: variant.rowVersion,
      colorId: variant.colorId ?? "",
      sizeGroupId: variant.sizeGroupId ?? "",
      sizeCode: variant.sizeCode,
      barcode: variant.barcode,
      purchasePrice: variant.purchasePrice,
      salePrice: variant.salePrice,
      status: variant.status,
    })),
  };
}

// Start / End size of the Sizes grid (docx 4.1): every size of the group from start to end, in the group's own order,
// becomes a row with the given prices. Sizes already in the grid (same size and colour) are not added twice.
// Returns null when the start or end is not in the list, or the end comes before the start.
export function buildRowsForSizeRange(options: {
  orderedSizeCodes: readonly string[];
  startSizeCode: string;
  endSizeCode: string;
  sizeGroupId: string;
  colorId: string;
  purchasePrice: number | null;
  salePrice: number | null;
  existingRows: readonly ProductVariantFormRow[];
}): ProductVariantFormRow[] | null {
  const startIndex = options.orderedSizeCodes.indexOf(options.startSizeCode);
  const endIndex = options.orderedSizeCodes.indexOf(options.endSizeCode);
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) return null;
  const alreadyThere = new Set(options.existingRows.map((row) => `${row.colorId}|${row.sizeCode.trim().toLowerCase()}`));
  const added: ProductVariantFormRow[] = [];
  for (const sizeCode of options.orderedSizeCodes.slice(startIndex, endIndex + 1)) {
    if (alreadyThere.has(`${options.colorId}|${sizeCode.trim().toLowerCase()}`)) continue;
    added.push({
      rowKey: createRowKey(),
      variantId: null,
      rowVersion: null,
      colorId: options.colorId,
      sizeGroupId: options.sizeGroupId,
      sizeCode,
      barcode: "",
      purchasePrice: options.purchasePrice,
      salePrice: options.salePrice,
      status: ProductStatusCodes.active,
    });
  }
  return added;
}

// The whole-number sizes typed for a free size range. Empty when the text is not a usable range.
export function buildNumericSizeCodes(startText: string, endText: string): string[] {
  if (!/^\d+$/.test(startText) || !/^\d+$/.test(endText)) return [];
  const start = Number(startText);
  const count = Number(endText) - start + 1;
  if (!Number.isSafeInteger(start) || count < 1 || count > CatalogueLimits.maximumVariantsPerProduct) return [];
  return Array.from({ length: count }, (_, index) => String(start + index));
}

export function validateProductForm(values: ProductFormValues): { errors: ProductFormErrors; rowErrors: ProductVariantRowErrors } {
  const errors: ProductFormErrors = {};
  const rowErrors: ProductVariantRowErrors = {};
  const name = values.name.trim();
  if (name === "") errors.name = "catalogue.validation.nameRequired";
  else if (name.length > CatalogueLimits.productNameMaximumLength) errors.name = "catalogue.validation.nameTooLong";
  if (values.nameUrdu.trim().length > CatalogueLimits.productNameMaximumLength) errors.nameUrdu = "catalogue.validation.nameTooLong";
  if (values.departmentId === "") errors.departmentId = "catalogue.validation.departmentRequired";
  if (values.categoryId === "") errors.categoryId = "catalogue.validation.categoryRequired";
  if (values.weight !== null && (values.weight < 0 || values.weight > CatalogueLimits.weightMaximum)) errors.weight = "catalogue.validation.weightRange";
  if (values.description.trim().length > CatalogueLimits.descriptionMaximumLength) errors.description = "catalogue.validation.descriptionTooLong";
  if (values.taxRate === null || values.taxRate < 0 || values.taxRate > CatalogueLimits.taxRateMaximum) errors.taxRate = "catalogue.validation.taxRateRange";
  if (values.taxCode.trim().length > CatalogueLimits.taxCodeMaximumLength) errors.taxCode = "catalogue.validation.taxCodeTooLong";

  if (values.variants.length === 0) errors.variants = "catalogue.validation.sizeRequired";
  else if (values.variants.length > CatalogueLimits.maximumVariantsPerProduct) errors.variants = "catalogue.validation.tooManySizes";

  const seenSizes = new Set<string>();
  const seenBarcodes = new Set<string>();
  for (const row of values.variants) {
    const sizeCode = row.sizeCode.trim();
    const barcode = row.barcode.trim();
    const sizeKey = `${row.colorId}|${sizeCode.toLowerCase()}`;
    if (sizeCode === "") rowErrors[row.rowKey] = "catalogue.validation.sizeCodeRequired";
    else if (sizeCode.length > CatalogueLimits.sizeCodeMaximumLength) rowErrors[row.rowKey] = "catalogue.validation.sizeCodeTooLong";
    else if (seenSizes.has(sizeKey)) rowErrors[row.rowKey] = "catalogue.validation.sizeDuplicated";
    else if (barcode.length > CatalogueLimits.barcodeMaximumLength) rowErrors[row.rowKey] = "catalogue.validation.barcodeTooLong";
    else if (barcode !== "" && /[^\x21-\x7e]/.test(barcode)) rowErrors[row.rowKey] = "catalogue.validation.barcodeCharacters";
    else if (barcode !== "" && seenBarcodes.has(barcode)) rowErrors[row.rowKey] = "catalogue.validation.barcodeDuplicated";
    else if (row.purchasePrice === null || row.salePrice === null) rowErrors[row.rowKey] = "catalogue.validation.priceRequired";
    else if (row.purchasePrice < 0 || row.salePrice < 0 || row.purchasePrice > CatalogueLimits.maximumPrice || row.salePrice > CatalogueLimits.maximumPrice)
      rowErrors[row.rowKey] = "catalogue.validation.priceRange";
    seenSizes.add(sizeKey);
    if (barcode !== "") seenBarcodes.add(barcode);
  }
  return { errors, rowErrors };
}

export function hasProductFormErrors(result: { errors: ProductFormErrors; rowErrors: ProductVariantRowErrors }): boolean {
  return Object.keys(result.errors).length > 0 || Object.keys(result.rowErrors).length > 0;
}

function blankToNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

function toVariantInput(row: ProductVariantFormRow): ProductVariantInput {
  return {
    variantId: row.variantId,
    colorId: blankToNull(row.colorId),
    sizeGroupId: blankToNull(row.sizeGroupId),
    sizeCode: row.sizeCode.trim(),
    barcode: blankToNull(row.barcode),
    purchasePrice: row.purchasePrice ?? 0,
    salePrice: row.salePrice ?? 0,
    rowVersion: row.rowVersion,
    status: row.status,
  };
}

function toSaveFields(values: ProductFormValues) {
  return {
    name: values.name.trim(),
    nameUrdu: blankToNull(values.nameUrdu),
    departmentId: values.departmentId,
    categoryId: values.categoryId,
    brandId: blankToNull(values.brandId),
    seasonId: blankToNull(values.seasonId),
    genderId: blankToNull(values.genderId),
    productTypeId: blankToNull(values.productTypeId),
    unitId: blankToNull(values.unitId),
    locationId: blankToNull(values.locationId),
    weight: values.weight,
    description: blankToNull(values.description),
    taxRate: values.taxRate ?? 0,
    taxCode: blankToNull(values.taxCode),
    status: values.status,
    variants: values.variants.map(toVariantInput),
  };
}

export function toCreateProductRequest(values: ProductFormValues): CreateProductRequest {
  return toSaveFields(values);
}

export function toUpdateProductRequest(values: ProductFormValues, rowVersion: number): UpdateProductRequest {
  return { ...toSaveFields(values), rowVersion };
}
