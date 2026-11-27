// Shapes of the catalogue API (backend EFootwear.BLL/Catalogue/Contracts). Camel-case JSON. Money is a whole number of rupees
// (decision D-009), quantities have up to 3 decimals, percentages up to 4. Enums travel as string codes.

export const ProductStatusCodes = {
  active: "ACTIVE",
  inactive: "INACTIVE",
} as const;
export type ProductStatusCode = (typeof ProductStatusCodes)[keyof typeof ProductStatusCodes];

// Which part of the product a search looks in (backend ProductSearchFieldCodes).
export const ProductSearchFieldCodes = {
  all: "ALL",
  name: "NAME",
  code: "CODE",
  barcode: "BARCODE",
} as const;
export type ProductSearchFieldCode = (typeof ProductSearchFieldCodes)[keyof typeof ProductSearchFieldCodes];

// How the search text is compared (backend ProductMatchModeCodes).
export const ProductMatchModeCodes = {
  contains: "CONTAINS",
  startsWith: "START",
  endsWith: "END",
  exact: "EXACT",
} as const;
export type ProductMatchModeCode = (typeof ProductMatchModeCodes)[keyof typeof ProductMatchModeCodes];

// Which price a bulk price change moves (backend PriceTypeCodes).
export const PriceTypeCodes = {
  sale: "SALE",
  purchase: "PURCHASE",
} as const;
export type PriceTypeCode = (typeof PriceTypeCodes)[keyof typeof PriceTypeCodes];

// The product field the Change Attributes screen replaces (backend ProductAttributeFieldCodes).
export const ProductAttributeFieldCodes = {
  unit: "UNIT",
  brand: "BRAND",
  category: "CATEGORY",
  gender: "GENDER",
  season: "SEASON",
  color: "COLOR",
} as const;
export type ProductAttributeFieldCode = (typeof ProductAttributeFieldCodes)[keyof typeof ProductAttributeFieldCodes];

// The filters every product grid understands (backend ProductListFilter).
export type ProductListFilterValues = {
  storeId?: string;
  departmentId?: string;
  categoryId?: string;
  brandId?: string;
  genderId?: string;
  seasonId?: string;
  colorId?: string;
  onlyActive?: boolean;
  searchField?: ProductSearchFieldCode;
  matchMode?: ProductMatchModeCode;
  includeDescription?: boolean;
};

export type ProductVariantListItemResponse = {
  productId: string;
  variantId: string;
  productCode: string;
  barcode: string;
  productName: string;
  productNameUrdu: string | null;
  unitName: string | null;
  sizeCode: string;
  colorName: string | null;
  stockQuantity: number;
  purchasePrice: number;
  salePrice: number;
  discountPercent: number | null;
  discountAmount: number;
  netPrice: number;
  marginPercent: number | null;
  markupPercent: number | null;
  departmentName: string;
  categoryName: string;
  brandName: string | null;
  genderName: string | null;
  seasonName: string | null;
  status: string;
};

export type ProductVariantDetailResponse = {
  variantId: string;
  colorId: string | null;
  sizeGroupId: string | null;
  sizeCode: string;
  barcode: string;
  status: string;
  purchasePrice: number;
  salePrice: number;
  rowVersion: number;
};

export type ProductImageResponse = { slot: number };

// One size as a product picker lists it: names and codes only (never prices or stock).
export type ProductLookupResponse = {
  productId: string;
  variantId: string;
  productCode: string;
  productName: string;
  barcode: string;
  sizeCode: string;
  colorName: string | null;
  brandName: string | null;
};

export type ProductDetailResponse = {
  id: string;
  code: string;
  name: string;
  nameUrdu: string | null;
  departmentId: string;
  categoryId: string;
  brandId: string | null;
  seasonId: string | null;
  genderId: string | null;
  productTypeId: string | null;
  unitId: string | null;
  locationId: string | null;
  weight: number | null;
  description: string | null;
  taxRate: number;
  taxCode: string | null;
  status: string;
  createdAt: string;
  rowVersion: number;
  variants: ProductVariantDetailResponse[];
  images: ProductImageResponse[];
};

export type ProductVariantInput = {
  variantId: string | null;
  colorId: string | null;
  sizeGroupId: string | null;
  sizeCode: string;
  barcode: string | null;
  purchasePrice: number;
  salePrice: number;
  rowVersion: number | null;
  status: string | null;
};

export type SaveProductRequestFields = {
  name: string;
  nameUrdu: string | null;
  departmentId: string;
  categoryId: string;
  brandId: string | null;
  seasonId: string | null;
  genderId: string | null;
  productTypeId: string | null;
  unitId: string | null;
  locationId: string | null;
  weight: number | null;
  description: string | null;
  taxRate: number;
  taxCode: string | null;
  status: string;
  variants: ProductVariantInput[];
};

export type CreateProductRequest = SaveProductRequestFields;
export type UpdateProductRequest = SaveProductRequestFields & { rowVersion: number };
export type ProductSavedResponse = { productId: string; code: string };
export type NextProductCodeResponse = { code: string };

export type PriceHistoryEntryResponse = {
  storeId: string | null;
  storeName: string | null;
  oldPurchasePrice: number | null;
  newPurchasePriceLowest: number | null;
  newPurchasePriceHighest: number | null;
  oldSalePrice: number | null;
  newSalePriceLowest: number | null;
  newSalePriceHighest: number | null;
  batchId: string | null;
  reason: string | null;
  changedAt: string;
  changedByName: string | null;
};

export type VariantPriceLookupResponse = {
  variantId: string;
  productId: string;
  productCode: string;
  barcode: string;
  productName: string;
  productNameUrdu: string | null;
  sizeCode: string;
  colorName: string | null;
  brandName: string | null;
  stockQuantity: number;
  listPrice: number;
  storePrice: number;
  effectiveSalePrice: number;
  discountAmount: number;
  discountPercent: number | null;
  isPriceInConflict: boolean;
  storeId: string | null;
};

export type ProductLedgerSummaryLineResponse = {
  documentType: string;
  quantityIn: number;
  quantityOut: number;
  movementCount: number;
};

export type ProductLedgerLineResponse = {
  transactionDate: string;
  transactionAt: string;
  sizeCode: string;
  barcode: string;
  documentType: string;
  documentId: string;
  quantityIn: number;
  quantityOut: number;
  quantityAfter: number;
  unitCost: number;
};

export type ProductLedgerResponse = {
  productId: string;
  productCode: string;
  productName: string;
  storeId: string;
  storeName: string;
  fromDate: string;
  toDate: string;
  openingQuantity: number;
  closingQuantity: number;
  summary: ProductLedgerSummaryLineResponse[];
  lines: ProductLedgerLineResponse[];
};

export type ProductStockByStoreRowResponse = {
  productId: string;
  productCode: string;
  productName: string;
  storeId: string;
  storeName: string;
  sizeCode: string;
  barcode: string;
  stockQuantity: number;
};

export type ProductReportRowResponse = {
  productId: string;
  productCode: string;
  productName: string;
  purchasePrice: number;
  salePrice: number;
  brandName: string | null;
  seasonName: string | null;
  colorName: string | null;
  storeId: string;
  storeName: string;
  stockQuantity: number;
};

// Bulk price changes.
export type PriceChangeRowResponse = {
  productId: string;
  variantId: string;
  productCode: string;
  productName: string;
  sizeCode: string;
  barcode: string;
  categoryName: string | null;
  brandName: string | null;
  genderName: string | null;
  seasonName: string | null;
  stockQuantity: number;
  purchasePrice: number;
  currentSalePrice: number;
  currentPrice: number;
  newPrice: number;
};

export type OldToNewPriceChangeRequest = {
  priceType: PriceTypeCode;
  storeId: string | null;
  departmentId: string | null;
  categoryId: string | null;
  brandId: string | null;
  oldPrice: number;
  newPrice: number;
  clientTransactionId: string;
};

export type PercentagePriceChangeRequest = {
  storeId: string | null;
  departmentId: string | null;
  categoryId: string | null;
  brandId: string | null;
  increasePercent: number | null;
  decreasePercent: number | null;
  clientTransactionId: string;
};

export type SetNewSalePriceRequest = {
  storeId: string | null;
  productIds: string[];
  newSalePrice: number;
  clientTransactionId: string;
};

export type PriceChangeAppliedResponse = {
  batchId: string;
  changedVariantCount: number;
  conflictingVariantCount: number;
  wasAlreadyApplied: boolean;
};

// Discounts.
export type StockRangeDiscountRowResponse = {
  productId: string;
  productCode: string;
  productName: string;
  brandName: string | null;
  genderName: string | null;
  seasonName: string | null;
  locationName: string | null;
  stockQuantity: number;
  salePrice: number;
  discountPercent: number | null;
  discountAmount: number;
};

export type StockRangeDiscountRequest = {
  storeId: string;
  brandId: string | null;
  minimumStock: number;
  maximumStock: number;
  discountPercent: number;
  clientTransactionId: string;
};

export type ProductStoreDiscountRowResponse = {
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  stockQuantity: number;
  discountPercent: number | null;
};

export type ProductDiscountOnStoresRequest = {
  productId: string;
  storeIds: string[];
  discountPercent: number;
  clientTransactionId: string;
};

export type RemoveProductDiscountsRequest = {
  storeId: string;
  productIds: string[];
  alsoRestorePreviousSalePrice: boolean;
  clientTransactionId: string;
};

export type ProductDiscountAppliedResponse = {
  batchId: string;
  affectedProductCount: number;
  affectedStoreCount: number;
  conflictingVariantCount: number;
  restoredPriceVariantCount: number;
  skippedRestoreVariantCount: number;
  wasAlreadyApplied: boolean;
};

// Change Attributes.
export type ProductAttributeRowResponse = {
  productId: string;
  productCode: string;
  productName: string;
  unitName: string | null;
  brandName: string | null;
  categoryName: string | null;
  genderName: string | null;
  seasonName: string | null;
  colorName: string | null;
};

export type ChangeProductAttributeRequest = {
  fieldType: ProductAttributeFieldCode;
  oldValueId: string;
  newValueId: string;
  clientTransactionId: string;
};

export type AttributeChangeAppliedResponse = {
  changedProductCount: number;
  skippedProducts: string[];
};

// Barcodes.
export type BarcodeReplacementPairRequest = { oldBarcode: string; newBarcode: string };

export type ReplaceBarcodesRequest = {
  pairs: BarcodeReplacementPairRequest[];
  reason: string | null;
  clientTransactionId: string;
};

export type BarcodeReplacementRowResponse = {
  rowNumber: number;
  oldBarcode: string;
  newBarcode: string;
  productName: string | null;
  sizeCode: string | null;
  isValid: boolean;
  problem: string | null;
};

export type BarcodeReplacementPreviewResponse = {
  rows: BarcodeReplacementRowResponse[];
  validRowCount: number;
  invalidRowCount: number;
};

export type BarcodesReplacedResponse = { batchId: string; replacedCount: number; wasAlreadyApplied: boolean };

export type BarcodeHistoryEntryResponse = {
  id: string;
  variantId: string;
  productName: string;
  sizeCode: string;
  oldBarcode: string;
  newBarcode: string;
  batchId: string | null;
  reason: string | null;
  changedAt: string;
  changedByName: string | null;
};

export type BarcodeLabelItemRequest = { variantId: string; copies: number };
export type BarcodeLabelRequest = { items: BarcodeLabelItemRequest[]; storeId: string | null };

export type BarcodeLabelResponse = {
  variantId: string;
  barcode: string;
  productCode: string;
  productName: string;
  productNameUrdu: string | null;
  sizeCode: string;
  colorName: string | null;
  brandName: string | null;
  salePrice: number;
  copies: number;
};

// Price bands.
export type PriceBandResponse = {
  id: string;
  name: string;
  minimumPrice: number;
  maximumPrice: number | null;
  sortOrder: number;
  rowVersion: number;
};

export type SavePriceBandRequest = {
  name: string;
  minimumPrice: number;
  maximumPrice: number | null;
  sortOrder: number;
  rowVersion: number | null;
};

export type CreatedIdResponse = { id: string };
