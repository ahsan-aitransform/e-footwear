// Shapes of the promotions API (special offers and their products, sales on stores, sales on categories, deals and conflicts). They mirror the C# records in
// EFootwear.BLL/Promotions/Contracts. Money is a whole number of rupees; a discount percentage is above 0 and up to 100 with at most two decimals; timestamps are ISO text.

export const PromotionKindCodes = {
  specialOffer: "SPECIAL_OFFER",
  saleOnStores: "SALE_ON_STORES",
  saleOnCategories: "SALE_ON_CATEGORIES",
} as const;

export type PromotionKindCode = (typeof PromotionKindCodes)[keyof typeof PromotionKindCodes];

export const PromotionPhaseCodes = {
  inactive: "INACTIVE",
  scheduled: "SCHEDULED",
  running: "RUNNING",
  ended: "ENDED",
} as const;

export type PromotionPhaseCode = (typeof PromotionPhaseCodes)[keyof typeof PromotionPhaseCodes];

export type PromotionStoreResponse = { storeId: string; storeName: string };

export type PromotionCategoryResponse = { categoryId: string; categoryName: string; departmentName: string };

export type PromotionRuleResponse = {
  id: string;
  kindCode: string;
  name: string;
  discountPercent: number | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  phaseCode: string;
  storeCount: number;
  categoryCount: number;
  lineCount: number;
  stores: PromotionStoreResponse[];
  categories: PromotionCategoryResponse[];
  rowVersion: number;
};

export type SavePromotionRuleRequest = {
  name: string;
  discountPercent: number | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  storeIds: string[];
  categoryIds: string[];
  rowVersion: number | null;
};

export type SpecialOfferLineResponse = {
  lineId: string;
  variantId: string;
  barcode: string;
  productCode: string;
  productName: string;
  sizeCode: string;
  colorName: string | null;
  categoryName: string;
  genderName: string | null;
  seasonName: string | null;
  brandName: string | null;
  discountPercent: number;
};

export type AddSpecialOfferLinesRequest = {
  barcode: string | null;
  categoryId: string | null;
  brandId: string | null;
  discountPercent: number | null;
};

export type AddSpecialOfferLinesResponse = { addedCount: number; skippedCount: number };

export type UpdateSpecialOfferLineRequest = { discountPercent: number | null };

export type DealLineResponse = {
  variantId: string;
  barcode: string;
  productCode: string;
  productName: string;
  sizeCode: string;
  quantity: number;
  salePrice: number;
  netUnitPrice: number;
  amount: number;
};

export type DealResponse = {
  id: string;
  name: string;
  barcode: string;
  bundlePrice: number;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  phaseCode: string;
  lineCount: number;
  totalQuantity: number;
  lines: DealLineResponse[];
  rowVersion: number;
};

export type SaveDealLineRequest = { variantId: string; quantity: number; netUnitPrice: number };

export type SaveDealRequest = {
  name: string;
  barcode: string | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  lines: SaveDealLineRequest[];
  rowVersion: number | null;
};

export type DealVariantLookupResponse = {
  variantId: string;
  barcode: string;
  productCode: string;
  productName: string;
  sizeCode: string;
  salePrice: number;
};

export type PromotionConflictCandidateResponse = {
  ruleId: string;
  ruleName: string;
  kindCode: string;
  salePrice: number;
  discountPercent: number | null;
};

export type PromotionConflictResponse = {
  groupId: string;
  storeId: string;
  storeName: string;
  variantId: string;
  barcode: string;
  productName: string;
  sizeCode: string;
  listPrice: number;
  candidates: PromotionConflictCandidateResponse[];
};

export type ResolvePromotionConflictRequest = { chosenRuleId: string };

// Limits the server also checks (EFootwear.Domain/Promotions/PromotionRules); a quick message here saves a round trip.
export const PromotionLimits = {
  nameMaximumLength: 120,
  maximumPercentage: 100,
  percentageDecimalPlaces: 2,
  maximumDealLines: 50,
} as const;

// The staff-free master lists the offer details screen picks from (name only, no permission needed beyond being signed in).
export type MasterOptionResponse = { id: string; code: string | null; name: string; nameUrdu: string | null };
