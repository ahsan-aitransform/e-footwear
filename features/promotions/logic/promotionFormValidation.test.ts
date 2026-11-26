import { describe, expect, it } from "vitest";
import { isoToLocalInputValue, localInputValueToIso } from "./promotionDateTime";
import {
  buildSaveDealRequest,
  buildSavePromotionRuleRequest,
  dealTotalAmount,
  dealTotalQuantity,
  discountAmountFromNetPrice,
  discountPercentFromNetPrice,
  hasDealFormErrors,
  hasPromotionRuleFormErrors,
  isValidDiscountPercentage,
  netPriceFromDiscountPercent,
  validateDealForm,
  validatePromotionRuleForm,
  type DealFormValues,
  type PromotionRuleFormValues,
} from "./promotionFormValidation";

const STORE_ID = "0197c3a0-aaaa-7000-8000-00000000000a";
const CATEGORY_ID = "0197c3a0-bbbb-7000-8000-00000000000b";

function validRule(overrides: Partial<PromotionRuleFormValues> = {}): PromotionRuleFormValues {
  return { name: "Eid sale", discountPercent: 10, startsAt: "2026-11-26T09:00", endsAt: "2026-12-26T21:00", isActive: true, storeIds: [STORE_ID], categoryIds: [], ...overrides };
}

function validDeal(overrides: Partial<DealFormValues> = {}): DealFormValues {
  return {
    name: "Two pairs",
    barcode: "",
    startsAt: "2026-11-26T09:00",
    endsAt: "",
    isActive: true,
    lines: [{ variantId: "v1", barcode: "B1", productName: "Sandal (101)", sizeCode: "27", quantity: 2, salePrice: 1_000, netUnitPrice: 800 }],
    ...overrides,
  };
}

describe("isValidDiscountPercentage", () => {
  it("accepts above 0 up to 100 with at most two decimals", () => {
    expect(isValidDiscountPercentage(0.01)).toBe(true);
    expect(isValidDiscountPercentage(12.5)).toBe(true);
    expect(isValidDiscountPercentage(100)).toBe(true);
  });

  it("refuses zero, negative, above 100, more than two decimals and nothing", () => {
    for (const refused of [0, -5, 100.01, 12.345, Number.NaN, null]) expect(isValidDiscountPercentage(refused)).toBe(false);
  });
});

describe("validatePromotionRuleForm", () => {
  it("accepts a sale on stores", () => {
    expect(hasPromotionRuleFormErrors(validatePromotionRuleForm("SALE_ON_STORES", validRule()))).toBe(false);
  });

  it("asks for a name and refuses one that is too long", () => {
    expect(validatePromotionRuleForm("SALE_ON_STORES", validRule({ name: "  " })).name?.messageKey).toBe("promotions.ruleForm.error.name");
    expect(validatePromotionRuleForm("SALE_ON_STORES", validRule({ name: "x".repeat(121) })).name?.messageKey).toBe("promotions.ruleForm.error.nameTooLong");
  });

  it("needs a percentage and at least one store for a sale, but neither for a special offer", () => {
    expect(validatePromotionRuleForm("SALE_ON_STORES", validRule({ discountPercent: null })).discountPercent).toBeDefined();
    expect(validatePromotionRuleForm("SALE_ON_STORES", validRule({ discountPercent: 101 })).discountPercent).toBeDefined();
    expect(validatePromotionRuleForm("SALE_ON_STORES", validRule({ storeIds: [] })).storeIds).toBeDefined();
    const offer = validatePromotionRuleForm("SPECIAL_OFFER", validRule({ discountPercent: null, storeIds: [] }));
    expect(hasPromotionRuleFormErrors(offer)).toBe(false);
  });

  it("needs categories for a sale on categories only", () => {
    expect(validatePromotionRuleForm("SALE_ON_CATEGORIES", validRule()).categoryIds).toBeDefined();
    expect(hasPromotionRuleFormErrors(validatePromotionRuleForm("SALE_ON_CATEGORIES", validRule({ categoryIds: [CATEGORY_ID] })))).toBe(false);
    expect(validatePromotionRuleForm("SALE_ON_STORES", validRule()).categoryIds).toBeUndefined();
  });

  it("checks the dates and their order, and an empty end means no end", () => {
    expect(validatePromotionRuleForm("SALE_ON_STORES", validRule({ startsAt: "" })).startsAt).toBeDefined();
    expect(validatePromotionRuleForm("SALE_ON_STORES", validRule({ endsAt: "2026-11-26T09:00" })).endsAt?.messageKey).toBe("promotions.ruleForm.error.endBeforeStart");
    expect(validatePromotionRuleForm("SALE_ON_STORES", validRule({ endsAt: "2026-11-25T09:00" })).endsAt).toBeDefined();
    expect(validatePromotionRuleForm("SALE_ON_STORES", validRule({ endsAt: "not a date" })).endsAt?.messageKey).toBe("promotions.ruleForm.error.endsAt");
    expect(validatePromotionRuleForm("SALE_ON_STORES", validRule({ endsAt: "" })).endsAt).toBeUndefined();
  });
});

describe("buildSavePromotionRuleRequest", () => {
  it("sends the percentage and stores of a sale, with no end as null and the row version", () => {
    const request = buildSavePromotionRuleRequest("SALE_ON_STORES", validRule({ name: " Eid sale ", endsAt: "", categoryIds: [CATEGORY_ID] }), 4);
    expect(request).toMatchObject({ name: "Eid sale", discountPercent: 10, endsAt: null, storeIds: [STORE_ID], categoryIds: [], rowVersion: 4 });
    expect(request.startsAt).toBe(new Date("2026-11-26T09:00").toISOString());
  });

  it("sends no percentage for an offer and the categories only for a sale on categories", () => {
    expect(buildSavePromotionRuleRequest("SPECIAL_OFFER", validRule(), null)).toMatchObject({ discountPercent: null, categoryIds: [], rowVersion: null });
    expect(buildSavePromotionRuleRequest("SALE_ON_CATEGORIES", validRule({ categoryIds: [CATEGORY_ID] }), null).categoryIds).toEqual([CATEGORY_ID]);
  });
});

describe("the two-way discount of a deal line", () => {
  it("works out the net price from a percentage, rounded to a whole rupee and kept between 0 and the sale price", () => {
    expect(netPriceFromDiscountPercent(1_000, 20)).toBe(800);
    expect(netPriceFromDiscountPercent(999, 10)).toBe(899);
    expect(netPriceFromDiscountPercent(1_000, 100)).toBe(0);
    expect(netPriceFromDiscountPercent(1_000, 0)).toBe(1_000);
  });

  it("works out the percentage and the amount from the net price", () => {
    expect(discountPercentFromNetPrice(1_000, 800)).toBe(20);
    expect(discountPercentFromNetPrice(1_000, 750)).toBe(25);
    expect(discountPercentFromNetPrice(3, 2)).toBe(33.33);
    expect(discountPercentFromNetPrice(0, 0)).toBe(0);
    expect(discountAmountFromNetPrice(1_000, 800)).toBe(200);
  });

  it("adds up the quantity and the amount of the lines", () => {
    const lines = [
      { variantId: "a", barcode: "A", productName: "A", sizeCode: "1", quantity: 2, salePrice: 1_000, netUnitPrice: 800 },
      { variantId: "b", barcode: "B", productName: "B", sizeCode: "2", quantity: 1, salePrice: 900, netUnitPrice: 900 },
    ];
    expect(dealTotalQuantity(lines)).toBe(3);
    expect(dealTotalAmount(lines)).toBe(2_500);
  });
});

describe("validateDealForm", () => {
  it("accepts a deal with a line", () => {
    expect(hasDealFormErrors(validateDealForm(validDeal()))).toBe(false);
  });

  it("asks for a name, a start, and at least one product", () => {
    expect(validateDealForm(validDeal({ name: "" })).name).toBeDefined();
    expect(validateDealForm(validDeal({ startsAt: "" })).startsAt).toBeDefined();
    expect(validateDealForm(validDeal({ lines: [] })).lines?.messageKey).toBe("promotions.dealForm.error.noLines");
  });

  it("refuses a barcode with a space and an end before the start", () => {
    expect(validateDealForm(validDeal({ barcode: "has space" })).barcode).toBeDefined();
    expect(validateDealForm(validDeal({ endsAt: "2026-11-25T09:00" })).endsAt).toBeDefined();
  });

  it("names the line whose quantity or net price is wrong", () => {
    const first = validDeal().lines[0];
    expect(validateDealForm(validDeal({ lines: [{ ...first, quantity: 0 }] })).lineMessages?.v1.messageKey).toBe("promotions.dealForm.error.quantity");
    expect(validateDealForm(validDeal({ lines: [{ ...first, quantity: 1.5 }] })).lineMessages?.v1).toBeDefined();
    expect(validateDealForm(validDeal({ lines: [{ ...first, netUnitPrice: null }] })).lineMessages?.v1.messageKey).toBe("promotions.dealForm.error.netPrice");
    expect(validateDealForm(validDeal({ lines: [{ ...first, netUnitPrice: -1 }] })).lineMessages?.v1).toBeDefined();
  });
});

describe("buildSaveDealRequest", () => {
  it("sends an empty barcode as null so the system makes one, and the lines with their net prices", () => {
    const request = buildSaveDealRequest(validDeal({ name: " Two pairs " }), 3);
    expect(request).toMatchObject({ name: "Two pairs", barcode: null, endsAt: null, isActive: true, rowVersion: 3, lines: [{ variantId: "v1", quantity: 2, netUnitPrice: 800 }] });
  });

  it("keeps a typed barcode", () => {
    expect(buildSaveDealRequest(validDeal({ barcode: " PROMO-1 " }), null).barcode).toBe("PROMO-1");
  });
});

describe("the date and time field", () => {
  it("turns what the person typed into a moment and back", () => {
    const iso = localInputValueToIso("2026-11-26T09:30");
    expect(iso).toBe(new Date("2026-11-26T09:30").toISOString());
    expect(isoToLocalInputValue(iso)).toBe("2026-11-26T09:30");
  });

  it("gives nothing for text that is not a date and time", () => {
    expect(localInputValueToIso("")).toBeNull();
    expect(localInputValueToIso("2026-11-26")).toBeNull();
    expect(localInputValueToIso("2026-13-45T25:61")).toBeNull();
    expect(isoToLocalInputValue(null)).toBe("");
  });
});
