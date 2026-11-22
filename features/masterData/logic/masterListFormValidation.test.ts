import { describe, expect, it } from "vitest";
import {
  collapseWhiteSpace,
  emptyMasterListFormValues,
  hasFormErrors,
  masterListFormValuesFromItem,
  toSaveMasterListItemRequest,
  validateMasterListForm,
} from "./masterListFormValidation";

describe("master list form validation", () => {
  it("accepts a name and the defaults", () => {
    expect(validateMasterListForm({ ...emptyMasterListFormValues, name: "Shoes" })).toEqual({});
  });

  it("asks for a name, ignoring blanks", () => {
    expect(validateMasterListForm({ ...emptyMasterListFormValues, name: "   " }).name).toBe("masterData.validation.nameRequired");
  });

  it("refuses names, Urdu names and codes that are too long", () => {
    const errors = validateMasterListForm({ ...emptyMasterListFormValues, name: "x".repeat(121), nameUrdu: "y".repeat(121), code: "z".repeat(41) });
    expect(errors.name).toBe("masterData.validation.nameTooLong");
    expect(errors.nameUrdu).toBe("masterData.validation.nameTooLong");
    expect(errors.code).toBe("masterData.validation.codeTooLong");
    expect(hasFormErrors(errors)).toBe(true);
  });

  it("accepts only whole non-negative sort orders up to the limit", () => {
    const valid = (sortOrderText: string) => validateMasterListForm({ ...emptyMasterListFormValues, name: "A", sortOrderText }).sortOrder;
    expect(valid("0")).toBeUndefined();
    expect(valid("100000")).toBeUndefined();
    expect(valid("100001")).toBe("masterData.validation.sortOrderInvalid");
    expect(valid("-1")).toBe("masterData.validation.sortOrderInvalid");
    expect(valid("1.5")).toBe("masterData.validation.sortOrderInvalid");
    expect(valid("")).toBe("masterData.validation.sortOrderInvalid");
  });

  it("collapses inner spaces like the server does", () => {
    expect(collapseWhiteSpace("  Men    Shoes ")).toBe("Men Shoes");
  });

  it("builds the request with trimmed text and null for empty optional fields", () => {
    expect(
      toSaveMasterListItemRequest({ name: "  Kids  Shoes ", nameUrdu: " ", code: " KS ", sortOrderText: "4", isActive: false }),
    ).toEqual({ name: "Kids Shoes", nameUrdu: null, code: "KS", sortOrder: 4, isActive: false });
  });

  it("fills the form from an item for editing", () => {
    expect(
      masterListFormValuesFromItem({ id: "1", code: null, name: "Winter", nameUrdu: "سردی", sortOrder: 2, isActive: true, rowVersion: 7 }),
    ).toEqual({ name: "Winter", nameUrdu: "سردی", code: "", sortOrderText: "2", isActive: true });
  });
});
