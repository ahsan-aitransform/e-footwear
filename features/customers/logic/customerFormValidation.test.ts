import { describe, expect, it } from "vitest";
import { emptyCustomerForm, toSaveCustomerRequest, validateCustomerForm } from "./customerFormValidation";

const today = "2026-11-26";
const valid = { ...emptyCustomerForm, name: "Ali Khan", phone: "0300 1234567" };

describe("validateCustomerForm", () => {
  it("needs only a name and a mobile number", () => {
    expect(validateCustomerForm(valid, today)).toEqual({});
    const errors = validateCustomerForm(emptyCustomerForm, today);
    expect(errors.name).toBe("validation.nameRequired");
    expect(errors.phone).toBe("validation.phoneRequired");
    expect(Object.keys(errors)).toHaveLength(2);
  });
  it("accepts a CNIC with or without dashes and refuses anything else", () => {
    expect(validateCustomerForm({ ...valid, cnic: "3520212345671" }, today).cnic).toBeUndefined();
    expect(validateCustomerForm({ ...valid, cnic: "35202-1234567-1" }, today).cnic).toBeUndefined();
    expect(validateCustomerForm({ ...valid, cnic: "35202-12345" }, today).cnic).toBe("validation.cnicFormat");
  });
});

describe("toSaveCustomerRequest", () => {
  it("makes a new customer regular and active, without an opening balance", () => {
    const request = toSaveCustomerRequest(valid);
    expect(request).toMatchObject({ customerTypeCode: "REGULAR", statusCode: "ACTIVE", openingBalance: null, cnic: null, email: null, cityId: null });
  });
  it("keeps the status of an edited customer", () => {
    expect(toSaveCustomerRequest(valid, "INACTIVE").statusCode).toBe("INACTIVE");
  });
});
