import { describe, expect, it } from "vitest";
import {
  buildSaveCommissionPlanRequest,
  hasCommissionPlanFormErrors,
  validateCommissionPlanForm,
  type CommissionPlanFormValues,
} from "./commissionPlanFormValidation";
import {
  buildSaveCommissionRuleRequest,
  hasCommissionRuleFormErrors,
  validateCommissionRuleForm,
  type CommissionRuleFormValues,
} from "./commissionRuleFormValidation";

const SALESMAN_ID = "0197c3a0-aaaa-7000-8000-00000000000a";

function validPlan(overrides: Partial<CommissionPlanFormValues> = {}): CommissionPlanFormValues {
  return {
    name: "Zaman 3 percent",
    appliesToCode: "SALESMAN",
    basisCode: "NET_SALE",
    calculationTypeCode: "PERCENT",
    defaultRate: 3,
    defaultFixedAmountPerPiece: null,
    minimumStoreSales: 0,
    storeId: "",
    validFrom: "2026-01-01",
    validTo: "",
    isActive: true,
    memberStaffIds: [SALESMAN_ID],
    ...overrides,
  };
}

function validRule(overrides: Partial<CommissionRuleFormValues> = {}): CommissionRuleFormValues {
  return {
    scopeCode: "CATEGORY",
    categoryId: "0197c3a0-bbbb-7000-8000-00000000000b",
    priceBandId: "",
    calculationTypeCode: "PERCENT",
    rate: 5,
    fixedAmountPerPiece: null,
    minimumLineAmount: 0,
    priority: 0,
    validFrom: "2026-01-01",
    validTo: "",
    ...overrides,
  };
}

describe("validateCommissionPlanForm", () => {
  it("accepts a plan for one salesman at three percent", () => {
    expect(hasCommissionPlanFormErrors(validatePlan(validPlan()))).toBe(false);
  });

  it("asks for a name and refuses one that is too long", () => {
    expect(validatePlan(validPlan({ name: "   " })).name?.messageKey).toBe("commissions.planForm.error.name");
    expect(validatePlan(validPlan({ name: "x".repeat(121) })).name?.messageKey).toBe("commissions.planForm.error.nameTooLong");
  });

  it("keeps a percentage between 0 and 100 and asks for it when the plan is a percentage plan", () => {
    expect(validatePlan(validPlan({ defaultRate: null })).defaultRate).toBeDefined();
    expect(validatePlan(validPlan({ defaultRate: 100.5 })).defaultRate).toBeDefined();
    expect(validatePlan(validPlan({ defaultRate: -1 })).defaultRate).toBeDefined();
    expect(validatePlan(validPlan({ defaultRate: 0 })).defaultRate).toBeUndefined();
    expect(validatePlan(validPlan({ defaultRate: 100 })).defaultRate).toBeUndefined();
  });

  it("asks for the amount per piece, in whole rupees, when the plan is a fixed plan", () => {
    const fixed = validPlan({ calculationTypeCode: "FIXED_PER_PIECE", defaultRate: null });
    expect(validatePlan(fixed).defaultFixedAmountPerPiece).toBeDefined();
    expect(validatePlan({ ...fixed, defaultFixedAmountPerPiece: 40.5 }).defaultFixedAmountPerPiece).toBeDefined();
    expect(validatePlan({ ...fixed, defaultFixedAmountPerPiece: 40 }).defaultFixedAmountPerPiece).toBeUndefined();
  });

  it("checks the dates and their order", () => {
    expect(validatePlan(validPlan({ validFrom: "" })).validFrom).toBeDefined();
    expect(validatePlan(validPlan({ validFrom: "2026-02-30" })).validFrom).toBeDefined();
    expect(validatePlan(validPlan({ validFrom: "2026-05-01", validTo: "2026-04-30" })).validTo?.messageKey).toBe("commissions.planForm.error.dateOrder");
    expect(validatePlan(validPlan({ validFrom: "2026-05-01", validTo: "2026-05-01" })).validTo).toBeUndefined();
  });

  it("refuses a negative minimum store sales", () => {
    expect(validatePlan(validPlan({ minimumStoreSales: -1 })).minimumStoreSales).toBeDefined();
  });

  function validatePlan(values: CommissionPlanFormValues) {
    return validateCommissionPlanForm(values);
  }
});

describe("buildSaveCommissionPlanRequest", () => {
  it("sends the percentage and no fixed amount for a percentage plan, with no store meaning every store", () => {
    const request = buildSaveCommissionPlanRequest(validPlan({ defaultFixedAmountPerPiece: 99, name: "  Zaman  " }), 7);
    expect(request).toMatchObject({ name: "Zaman", defaultRate: 3, defaultFixedAmountPerPiece: null, storeId: null, validTo: null, rowVersion: 7, memberStaffIds: [SALESMAN_ID] });
  });

  it("sends the fixed amount and no percentage for a fixed plan, and no row version when creating", () => {
    const request = buildSaveCommissionPlanRequest(
      validPlan({ calculationTypeCode: "FIXED_PER_PIECE", defaultRate: 3, defaultFixedAmountPerPiece: 40, storeId: "store-1", validTo: "2026-12-31" }),
      null,
    );
    expect(request).toMatchObject({ defaultRate: null, defaultFixedAmountPerPiece: 40, storeId: "store-1", validTo: "2026-12-31", rowVersion: null });
  });
});

describe("validateCommissionRuleForm", () => {
  it("accepts a category rule", () => {
    expect(hasCommissionRuleFormErrors(validateCommissionRuleForm(validRule()))).toBe(false);
  });

  it("asks for the category or the price band the rule is about", () => {
    expect(validateCommissionRuleForm(validRule({ categoryId: "" })).about).toBeDefined();
    expect(validateCommissionRuleForm(validRule({ scopeCode: "PRICE_BAND", priceBandId: "" })).about).toBeDefined();
    expect(validateCommissionRuleForm(validRule({ scopeCode: "PRICE_BAND", priceBandId: "band-1" })).about).toBeUndefined();
  });

  it("checks the rate, the amounts and the dates", () => {
    expect(validateCommissionRuleForm(validRule({ rate: 101 })).rate).toBeDefined();
    expect(validateCommissionRuleForm(validRule({ calculationTypeCode: "FIXED_PER_PIECE", rate: null, fixedAmountPerPiece: null })).fixedAmountPerPiece).toBeDefined();
    expect(validateCommissionRuleForm(validRule({ minimumLineAmount: -5 })).minimumLineAmount).toBeDefined();
    expect(validateCommissionRuleForm(validRule({ validFrom: "2026-06-01", validTo: "2026-05-01" })).validTo).toBeDefined();
  });
});

describe("buildSaveCommissionRuleRequest", () => {
  it("names only the category for a category rule and only the price band for a price band rule", () => {
    expect(buildSaveCommissionRuleRequest(validRule())).toMatchObject({ scopeCode: "CATEGORY", categoryId: "0197c3a0-bbbb-7000-8000-00000000000b", priceBandId: null, productId: null, rate: 5 });
    expect(buildSaveCommissionRuleRequest(validRule({ scopeCode: "PRICE_BAND", priceBandId: "band-1", calculationTypeCode: "FIXED_PER_PIECE", fixedAmountPerPiece: 25 }))).toMatchObject({
      scopeCode: "PRICE_BAND",
      categoryId: null,
      priceBandId: "band-1",
      rate: null,
      fixedAmountPerPiece: 25,
    });
  });
});
