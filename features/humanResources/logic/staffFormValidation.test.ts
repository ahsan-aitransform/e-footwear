import { describe, expect, it } from "vitest";
import { hasFormErrors, validateSalaryTermsForm, validateTransferForm } from "./staffFormValidation";

describe("pay terms form", () => {
  it("accepts zero or more whole rupees and a known pay frequency", () => {
    expect(hasFormErrors(validateSalaryTermsForm({ baseSalary: 0, payFrequencyCode: "MONTHLY" }))).toBe(false);
    expect(hasFormErrors(validateSalaryTermsForm({ baseSalary: 35_000, payFrequencyCode: "WEEKLY" }))).toBe(false);
  });

  it("refuses an empty or negative pay and an unknown frequency", () => {
    expect(validateSalaryTermsForm({ baseSalary: null, payFrequencyCode: "MONTHLY" }).baseSalary).toBeDefined();
    expect(validateSalaryTermsForm({ baseSalary: -1, payFrequencyCode: "MONTHLY" }).baseSalary).toBeDefined();
    expect(validateSalaryTermsForm({ baseSalary: 1_000, payFrequencyCode: "DAILY" }).payFrequencyCode).toBeDefined();
  });
});

describe("staff transfer form", () => {
  const valid = { staffId: "staff-1", toStoreId: "store-2", effectiveOn: "2026-10-15" };

  it("accepts a move to a different store from a valid date", () => {
    expect(hasFormErrors(validateTransferForm(valid, "store-1"))).toBe(false);
  });

  it("asks for the person, the store and a date", () => {
    const errors = validateTransferForm({ staffId: "", toStoreId: "", effectiveOn: "" }, "");
    expect(errors.staffId?.messageKey).toBe("humanResources.transfer.error.staff");
    expect(errors.toStoreId?.messageKey).toBe("humanResources.transfer.error.store");
    expect(errors.effectiveOn?.messageKey).toBe("humanResources.transfer.error.date");
  });

  it("refuses the store the person already works in", () => {
    expect(validateTransferForm({ ...valid, toStoreId: "store-1" }, "store-1").toStoreId?.messageKey).toBe("humanResources.transfer.error.sameStore");
  });
});
