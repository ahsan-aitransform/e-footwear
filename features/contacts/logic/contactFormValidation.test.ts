import { describe, expect, it } from "vitest";
import { createEmptyContactForm, hasContactFormErrors, toSaveContactRequest, validateContactForm } from "./contactFormValidation";

const today = "2026-11-24";
const valid = { ...createEmptyContactForm(today), name: "Ali Khan", phone: "0300 1234567" };

describe("validateContactForm", () => {
  it("accepts a name and a phone number", () => {
    expect(hasContactFormErrors(validateContactForm(valid, "customer", true, today))).toBe(false);
  });
  it("requires a name and a phone number for every kind", () => {
    for (const kind of ["customer", "vendor", "staff"] as const) {
      const errors = validateContactForm({ ...valid, name: " ", phone: "", storeId: "s" }, kind, true, today);
      expect(errors.name).toBe("validation.nameRequired");
      expect(errors.phone).toBe("validation.phoneRequired");
    }
  });
  it("rejects a bad phone, a bad e-mail and a birth date in the future", () => {
    const errors = validateContactForm({ ...valid, phone: "call me", email: "nope", birthDate: "2027-01-01" }, "customer", true, today);
    expect(errors.phone).toBe("validation.phoneFormat");
    expect(errors.email).toBe("validation.emailFormat");
    expect(errors.birthDate).toBe("validation.birthDateFuture");
  });
  it("checks the credit limit for vendors only", () => {
    expect(validateContactForm({ ...valid, creditLimit: -5 }, "vendor", true, today).creditLimit).toBe("validation.creditLimitNegative");
    expect(validateContactForm({ ...valid, creditLimit: -5 }, "customer", true, today).creditLimit).toBeUndefined();
  });
  it("needs a store for a new staff member but not when editing one", () => {
    expect(validateContactForm(valid, "staff", true, today).storeId).toBe("validation.storeRequired");
    expect(validateContactForm(valid, "staff", false, today).storeId).toBeUndefined();
  });
  it("needs a date for an opening balance", () => {
    const errors = validateContactForm({ ...valid, openingBalanceAmount: 100, openingBalanceAsOfDate: "" }, "customer", true, today);
    expect(errors.openingBalanceAsOfDate).toBe("validation.openingDateRequired");
  });
});

describe("toSaveContactRequest", () => {
  it("sends only the fields of the kind", () => {
    const form = { ...valid, creditLimit: 5000, designation: "Cashier", isManager: true, storeId: "store-1" };
    expect(toSaveContactRequest(form, "customer")).not.toHaveProperty("creditLimit");
    expect(toSaveContactRequest(form, "vendor").creditLimit).toBe(5000);
    expect(toSaveContactRequest(form, "vendor")).not.toHaveProperty("storeId");
    const staff = toSaveContactRequest(form, "staff");
    expect(staff.storeId).toBe("store-1");
    expect(staff.designation).toBe("Cashier");
    expect(staff.isManager).toBe(true);
  });
  it("turns empty text into null and builds the opening balance", () => {
    const request = toSaveContactRequest({ ...valid, email: " ", openingBalanceAmount: 300, openingBalanceSideCode: "CREDIT" }, "customer");
    expect(request.email).toBeNull();
    expect(request.openingBalance).toEqual({ sideCode: "CREDIT", amount: 300, asOfDate: today });
  });
});
