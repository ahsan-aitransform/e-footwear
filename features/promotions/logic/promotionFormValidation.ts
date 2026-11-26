import { validationMessage, type ValidationMessage } from "@/lib/validation/validationMessage";
import { localInputValueToIso } from "./promotionDateTime";
import {
  PromotionKindCodes,
  PromotionLimits,
  type DealLineResponse,
  type PromotionKindCode,
  type SaveDealRequest,
  type SavePromotionRuleRequest,
} from "../types/promotionTypes";

// ---- A discount percentage: above 0, up to 100, at most two decimals (the same rule as PromotionRules on the server) ----

export function isValidDiscountPercentage(percentage: number | null): percentage is number {
  if (percentage === null || !Number.isFinite(percentage)) return false;
  if (percentage <= 0 || percentage > PromotionLimits.maximumPercentage) return false;
  return Math.round(percentage * 100) / 100 === percentage;
}

// ---- Special offer, sale on stores, sale on categories ----

export type PromotionRuleFormValues = {
  name: string;
  discountPercent: number | null;
  // "yyyy-MM-ddTHH:mm" in the person's time zone; endsAt "" = no end.
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  storeIds: string[];
  categoryIds: string[];
};

export type PromotionRuleFormErrors = Partial<Record<keyof PromotionRuleFormValues, ValidationMessage>>;

export function validatePromotionRuleForm(kindCode: PromotionKindCode, values: PromotionRuleFormValues): PromotionRuleFormErrors {
  const errors: PromotionRuleFormErrors = {};
  const name = values.name.trim();
  if (name === "") errors.name = validationMessage("promotions.ruleForm.error.name");
  else if (name.length > PromotionLimits.nameMaximumLength) errors.name = validationMessage("promotions.ruleForm.error.nameTooLong", { maximum: PromotionLimits.nameMaximumLength });

  if (kindCode !== PromotionKindCodes.specialOffer && !isValidDiscountPercentage(values.discountPercent)) {
    errors.discountPercent = validationMessage("promotions.ruleForm.error.percentage");
  }
  if (kindCode !== PromotionKindCodes.specialOffer && values.storeIds.length === 0) errors.storeIds = validationMessage("promotions.ruleForm.error.stores");
  if (kindCode === PromotionKindCodes.saleOnCategories && values.categoryIds.length === 0) errors.categoryIds = validationMessage("promotions.ruleForm.error.categories");

  const startsAtIso = localInputValueToIso(values.startsAt);
  if (startsAtIso === null) errors.startsAt = validationMessage("promotions.ruleForm.error.startsAt");
  if (values.endsAt !== "") {
    const endsAtIso = localInputValueToIso(values.endsAt);
    if (endsAtIso === null) errors.endsAt = validationMessage("promotions.ruleForm.error.endsAt");
    else if (startsAtIso !== null && endsAtIso <= startsAtIso) errors.endsAt = validationMessage("promotions.ruleForm.error.endBeforeStart");
  }
  return errors;
}

export function hasPromotionRuleFormErrors(errors: PromotionRuleFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// The request body of a form that passed validation. An offer sends no percentage (each product carries its own); only a sale on categories sends categories.
export function buildSavePromotionRuleRequest(kindCode: PromotionKindCode, values: PromotionRuleFormValues, rowVersion: number | null): SavePromotionRuleRequest {
  return {
    name: values.name.trim(),
    discountPercent: kindCode === PromotionKindCodes.specialOffer ? null : values.discountPercent,
    startsAt: localInputValueToIso(values.startsAt) ?? "",
    endsAt: values.endsAt === "" ? null : localInputValueToIso(values.endsAt),
    isActive: values.isActive,
    storeIds: values.storeIds,
    categoryIds: kindCode === PromotionKindCodes.saleOnCategories ? values.categoryIds : [],
    rowVersion,
  };
}

// ---- Deals: two-way discount <-> net price (docx 2.12 "discount (% or amount, two-way synchronised) giving a net price") ----

// The net price after a percentage off the sale price, in whole rupees (rounded to the nearest rupee, never below 0 or above the sale price).
export function netPriceFromDiscountPercent(salePrice: number, discountPercent: number): number {
  const net = Math.round((salePrice * (100 - discountPercent)) / 100);
  return Math.min(Math.max(net, 0), Math.max(salePrice, 0));
}

// The percentage the net price is below the sale price (two decimals), 0 when the sale price is 0.
export function discountPercentFromNetPrice(salePrice: number, netPrice: number): number {
  if (salePrice <= 0) return 0;
  return Math.round(((salePrice - netPrice) * 10_000) / salePrice) / 100;
}

export function discountAmountFromNetPrice(salePrice: number, netPrice: number): number {
  return salePrice - netPrice;
}

export type DealFormLine = {
  variantId: string;
  barcode: string;
  productName: string;
  sizeCode: string;
  quantity: number | null;
  salePrice: number;
  netUnitPrice: number | null;
};

export type DealFormValues = {
  name: string;
  barcode: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  lines: DealFormLine[];
};

export type DealFormErrors = Partial<Record<"name" | "barcode" | "startsAt" | "endsAt" | "lines", ValidationMessage>> & { lineMessages?: Record<string, ValidationMessage> };

export function dealTotalQuantity(lines: readonly DealFormLine[]): number {
  return lines.reduce((total, line) => total + (line.quantity ?? 0), 0);
}

export function dealTotalAmount(lines: readonly DealFormLine[]): number {
  return lines.reduce((total, line) => total + (line.quantity ?? 0) * (line.netUnitPrice ?? 0), 0);
}

export function dealLinesOfResponse(lines: readonly DealLineResponse[]): DealFormLine[] {
  return lines.map((line) => ({
    variantId: line.variantId,
    barcode: line.barcode,
    productName: `${line.productName} (${line.productCode})`,
    sizeCode: line.sizeCode,
    quantity: line.quantity,
    salePrice: line.salePrice,
    netUnitPrice: line.netUnitPrice,
  }));
}

export function validateDealForm(values: DealFormValues): DealFormErrors {
  const errors: DealFormErrors = {};
  const name = values.name.trim();
  if (name === "") errors.name = validationMessage("promotions.dealForm.error.name");
  else if (name.length > PromotionLimits.nameMaximumLength) errors.name = validationMessage("promotions.dealForm.error.nameTooLong", { maximum: PromotionLimits.nameMaximumLength });
  if (values.barcode.trim() !== "" && /[^!-~]/.test(values.barcode.trim())) errors.barcode = validationMessage("promotions.dealForm.error.barcode");

  const startsAtIso = localInputValueToIso(values.startsAt);
  if (startsAtIso === null) errors.startsAt = validationMessage("promotions.ruleForm.error.startsAt");
  if (values.endsAt !== "") {
    const endsAtIso = localInputValueToIso(values.endsAt);
    if (endsAtIso === null) errors.endsAt = validationMessage("promotions.ruleForm.error.endsAt");
    else if (startsAtIso !== null && endsAtIso <= startsAtIso) errors.endsAt = validationMessage("promotions.ruleForm.error.endBeforeStart");
  }

  if (values.lines.length === 0) errors.lines = validationMessage("promotions.dealForm.error.noLines");
  else if (values.lines.length > PromotionLimits.maximumDealLines) errors.lines = validationMessage("promotions.dealForm.error.tooManyLines", { maximum: PromotionLimits.maximumDealLines });

  const lineMessages: Record<string, ValidationMessage> = {};
  for (const line of values.lines) {
    if (line.quantity === null || !Number.isSafeInteger(line.quantity) || line.quantity < 1) lineMessages[line.variantId] = validationMessage("promotions.dealForm.error.quantity");
    else if (line.netUnitPrice === null || !Number.isSafeInteger(line.netUnitPrice) || line.netUnitPrice < 0) lineMessages[line.variantId] = validationMessage("promotions.dealForm.error.netPrice");
  }
  if (Object.keys(lineMessages).length > 0) errors.lineMessages = lineMessages;
  return errors;
}

export function hasDealFormErrors(errors: DealFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function buildSaveDealRequest(values: DealFormValues, rowVersion: number | null): SaveDealRequest {
  return {
    name: values.name.trim(),
    barcode: values.barcode.trim() === "" ? null : values.barcode.trim(),
    startsAt: localInputValueToIso(values.startsAt) ?? "",
    endsAt: values.endsAt === "" ? null : localInputValueToIso(values.endsAt),
    isActive: values.isActive,
    lines: values.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity ?? 0, netUnitPrice: line.netUnitPrice ?? 0 })),
    rowVersion,
  };
}
