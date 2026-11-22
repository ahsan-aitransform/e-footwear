import { describe, expect, it } from "vitest";
import {
  booleanToSelectValue,
  nullableToText,
  numberToText,
  parseOptionalNumber,
  selectValueToBoolean,
  textToNullable,
} from "./settingsFormValues";

describe("settings form values", () => {
  it("turns empty text into null (not configured) and trims the rest", () => {
    expect(textToNullable("   ")).toBeNull();
    expect(textToNullable("  Bata  ")).toBe("Bata");
    expect(nullableToText(null)).toBe("");
    expect(nullableToText("x")).toBe("x");
  });

  it("parses an optional number: empty is null, text that is not a number is invalid", () => {
    expect(parseOptionalNumber("")).toEqual({ isValid: true, value: null });
    expect(parseOptionalNumber(" 17.5 ")).toEqual({ isValid: true, value: 17.5 });
    expect(parseOptionalNumber("abc")).toEqual({ isValid: false });
    expect(parseOptionalNumber("1e999")).toEqual({ isValid: false });
    expect(numberToText(null)).toBe("");
    expect(numberToText(30)).toBe("30");
  });

  it("keeps yes, no and not configured apart", () => {
    expect(booleanToSelectValue(true)).toBe("true");
    expect(booleanToSelectValue(false)).toBe("false");
    expect(booleanToSelectValue(null)).toBe("");
    expect(selectValueToBoolean("true")).toBe(true);
    expect(selectValueToBoolean("false")).toBe(false);
    expect(selectValueToBoolean("")).toBeNull();
  });
});
