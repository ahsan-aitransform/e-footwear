import { describe, expect, it } from "vitest";
import { createEmptyPartyForm, hasPartyFormErrors, toSavePartyRequest, validatePartyForm } from "./partyFormValidation";

const today = "2026-11-22";

describe("party form validation", () => {
  it("accepts a minimal customer", () => {
    const values = { ...createEmptyPartyForm(today), name: "Ali Traders" };
    expect(hasPartyFormErrors(validatePartyForm(values))).toBe(false);
  });

  it("asks for a name and at least one party type", () => {
    const values = { ...createEmptyPartyForm(today), isCustomer: false };
    const errors = validatePartyForm(values);
    expect(errors.name).toBe("parties.validation.nameRequired");
    expect(errors.partyType).toBe("parties.validation.partyTypeRequired");
  });

  it("checks the CNIC, phone and e-mail shapes only when filled in", () => {
    const bad = { ...createEmptyPartyForm(today), name: "A", cnic: "12345", primaryPhone: "abc", email: "no-at-sign" };
    const errors = validatePartyForm(bad);
    expect(errors.cnic).toBe("parties.validation.cnicFormat");
    expect(errors.primaryPhone).toBe("parties.validation.phoneFormat");
    expect(errors.email).toBe("parties.validation.emailFormat");

    const good = { ...createEmptyPartyForm(today), name: "A", cnic: "36302-1234567-1", primaryPhone: "0300-1234567", email: "a@b.pk" };
    expect(hasPartyFormErrors(validatePartyForm(good))).toBe(false);
  });

  it("requires a store for staff", () => {
    const staff = { ...createEmptyPartyForm(today), name: "Bilal", isCustomer: false, isStaff: true };
    expect(validatePartyForm(staff).staffStoreId).toBe("parties.validation.staffStoreRequired");
  });

  it("builds the request: trims text, empties become null, staff-only fields follow the staff flag", () => {
    const values = {
      ...createEmptyPartyForm(today),
      name: "  Ali  ",
      designation: "Cashier",
      isManager: true,
      staffStoreId: "store-1",
      openingBalanceAmount: 2_500,
    };
    const asCustomer = toSavePartyRequest(values);
    expect(asCustomer.name).toBe("Ali");
    expect(asCustomer.nameUrdu).toBeNull();
    expect(asCustomer.designation).toBeNull();
    expect(asCustomer.isManager).toBe(false);
    expect(asCustomer.staffStoreId).toBeNull();
    expect(asCustomer.openingBalance).toEqual({ sideCode: "DEBIT", amount: 2_500, asOfDate: today });

    const asStaff = toSavePartyRequest({ ...values, isStaff: true });
    expect(asStaff.designation).toBe("Cashier");
    expect(asStaff.isManager).toBe(true);
    expect(asStaff.staffStoreId).toBe("store-1");
  });

  it("sends no opening balance when the amount is empty or zero", () => {
    expect(toSavePartyRequest({ ...createEmptyPartyForm(today), name: "A" }).openingBalance).toBeNull();
    expect(toSavePartyRequest({ ...createEmptyPartyForm(today), name: "A", openingBalanceAmount: 0 }).openingBalance).toBeNull();
  });
});
