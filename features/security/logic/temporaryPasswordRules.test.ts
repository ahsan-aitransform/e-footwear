import { describe, expect, it } from "vitest";
import { findPasswordRuleViolation, MAXIMUM_PASSWORD_LENGTH } from "./temporaryPasswordRules";

describe("password rules", () => {
  it("accepts 8 or more characters with letters and digits", () => {
    expect(findPasswordRuleViolation("Password1")).toBeUndefined();
    expect(findPasswordRuleViolation("abcdefg1")).toBeUndefined();
    expect(findPasswordRuleViolation("Temporary#1234")).toBeUndefined();
  });

  it("refuses a short password", () => {
    expect(findPasswordRuleViolation("Ab1")).toBe("tooShort");
    expect(findPasswordRuleViolation("")).toBe("tooShort");
  });

  it("refuses a password without both letters and digits", () => {
    expect(findPasswordRuleViolation("onlyletters")).toBe("needsLettersAndDigits");
    expect(findPasswordRuleViolation("1234567890")).toBe("needsLettersAndDigits");
    expect(findPasswordRuleViolation("########")).toBe("needsLettersAndDigits");
  });

  it("refuses a password longer than the maximum", () => {
    expect(findPasswordRuleViolation("a1" + "x".repeat(MAXIMUM_PASSWORD_LENGTH))).toBe("tooLong");
  });

  it("counts Urdu letters and digits", () => {
    expect(findPasswordRuleViolation("پاسورڈ۱۲۳۴۵")).toBeUndefined();
  });
});
