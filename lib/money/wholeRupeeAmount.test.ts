import { describe, expect, it } from "vitest";
import { RoundingModes } from "@/lib/constants/moneyFormat";
import {
  applyPercentageToWholeRupees,
  assertWholeRupeeAmount,
  formatWholeRupees,
  isWholeRupeeAmount,
  multiplyWholeRupeesByQuantity,
  parseWholeRupeeInput,
  quantityToThousandths,
  sumWholeRupees,
} from "./wholeRupeeAmount";
import { formatPercentage, formatQuantity, parsePercentageInput, parseQuantityInput } from "./quantityAndPercentage";

describe("whole-rupee money (decision D-009)", () => {
  it("accepts integers only", () => {
    expect(isWholeRupeeAmount(1250)).toBe(true);
    expect(isWholeRupeeAmount(0)).toBe(true);
    expect(isWholeRupeeAmount(-500)).toBe(true);
    expect(isWholeRupeeAmount(12.5)).toBe(false);
    expect(isWholeRupeeAmount(Number.NaN)).toBe(false);
    expect(isWholeRupeeAmount("12")).toBe(false);
    expect(() => assertWholeRupeeAmount(0.1 + 0.2)).toThrow(RangeError);
  });

  it("formats with digit grouping and the rupee symbol", () => {
    expect(formatWholeRupees(1250000)).toBe("Rs 1,250,000");
    expect(formatWholeRupees(999)).toBe("Rs 999");
    expect(formatWholeRupees(-500)).toBe("-Rs 500");
    expect(formatWholeRupees(1250000, { withSymbol: false })).toBe("1,250,000");
  });

  it("parses what a person types: grouping, spaces, a minus, Urdu digits; rejects decimals", () => {
    expect(parseWholeRupeeInput("1,250,000")).toBe(1250000);
    expect(parseWholeRupeeInput(" 750 ")).toBe(750);
    expect(parseWholeRupeeInput("-40")).toBe(-40);
    expect(parseWholeRupeeInput("۱۲۳۴")).toBe(1234);
    expect(parseWholeRupeeInput("١٢٣")).toBe(123);
    expect(parseWholeRupeeInput("12.5")).toBeNull();
    expect(parseWholeRupeeInput("")).toBeNull();
    expect(parseWholeRupeeInput("abc")).toBeNull();
    expect(parseWholeRupeeInput("99999999999999999999")).toBeNull();
  });

  it("sums without floating-point error", () => {
    expect(sumWholeRupees([1999, 2999, 4999])).toBe(9997);
    expect(sumWholeRupees([])).toBe(0);
    expect(() => sumWholeRupees([1, 2.5])).toThrow(RangeError);
  });

  it("converts quantities to exact thousandths and rejects a fourth decimal", () => {
    expect(quantityToThousandths(2.5)).toBe(BigInt(2500));
    expect(quantityToThousandths("0.001")).toBe(BigInt(1));
    expect(quantityToThousandths(12)).toBe(BigInt(12000));
    expect(() => quantityToThousandths("1.2345")).toThrow(RangeError);
    expect(() => quantityToThousandths("abc")).toThrow(RangeError);
  });

  describe("quantity x price rounds like core.round_money", () => {
    it("FLOOR drops the fraction (1039.20 -> 1039)", () => {
      expect(multiplyWholeRupeesByQuantity(1999, 0.52, RoundingModes.floor)).toBe(1039);
    });
    it("NEAREST rounds half away from zero", () => {
      expect(multiplyWholeRupeesByQuantity(1999, 0.52, RoundingModes.nearest)).toBe(1039);
      expect(multiplyWholeRupeesByQuantity(1, 2.5, RoundingModes.nearest)).toBe(3);
      expect(multiplyWholeRupeesByQuantity(1, 2.4, RoundingModes.nearest)).toBe(2);
      expect(multiplyWholeRupeesByQuantity(-1, 2.5, RoundingModes.nearest)).toBe(-3);
    });
    it("FLOOR goes towards negative infinity for negative amounts", () => {
      expect(multiplyWholeRupeesByQuantity(-1, 2.5, RoundingModes.floor)).toBe(-3);
      expect(multiplyWholeRupeesByQuantity(-1999, 0.52, RoundingModes.floor)).toBe(-1040);
    });
    it("is exact where floating point is not (0.1 + 0.2 style traps)", () => {
      // 3 pieces x Rs 4999 = 14997 exactly; 0.07 x 100 in floats is 7.000000000000001
      expect(multiplyWholeRupeesByQuantity(4999, 3, RoundingModes.floor)).toBe(14997);
      expect(multiplyWholeRupeesByQuantity(100, 0.07, RoundingModes.floor)).toBe(7);
    });
  });

  describe("percentage of an amount", () => {
    it("10% of 1039 = 103.9", () => {
      expect(applyPercentageToWholeRupees(1039, 10, RoundingModes.floor)).toBe(103);
      expect(applyPercentageToWholeRupees(1039, 10, RoundingModes.nearest)).toBe(104);
    });
    it("supports four decimals", () => {
      expect(applyPercentageToWholeRupees(1000000, "12.3456", RoundingModes.floor)).toBe(123456);
      expect(() => applyPercentageToWholeRupees(1000, "12.34567", RoundingModes.floor)).toThrow(RangeError);
    });
    it("100% is the amount and 0% is zero", () => {
      expect(applyPercentageToWholeRupees(777, 100, RoundingModes.floor)).toBe(777);
      expect(applyPercentageToWholeRupees(777, 0, RoundingModes.floor)).toBe(0);
    });
  });
});

describe("quantity and percentage input", () => {
  it("parses quantities with at most 3 decimals", () => {
    expect(parseQuantityInput("12")).toBe(12);
    expect(parseQuantityInput("2.5")).toBe(2.5);
    expect(parseQuantityInput("0.125")).toBe(0.125);
    expect(parseQuantityInput("0.1234")).toBeNull();
    expect(parseQuantityInput("1,200.5")).toBe(1200.5);
    expect(parseQuantityInput("٣.٥")).toBe(3.5);
    expect(parseQuantityInput("")).toBeNull();
  });

  it("parses percentages from 0 to 100", () => {
    expect(parsePercentageInput("0")).toBe(0);
    expect(parsePercentageInput("12.5")).toBe(12.5);
    expect(parsePercentageInput("100")).toBe(100);
    expect(parsePercentageInput("100.0001")).toBeNull();
    expect(parsePercentageInput("-1")).toBeNull();
    expect(parsePercentageInput("1.23456")).toBeNull();
  });

  it("formats without trailing zeros", () => {
    expect(formatQuantity(12)).toBe("12");
    expect(formatQuantity(2.5)).toBe("2.5");
    expect(formatQuantity(1200.125)).toBe("1,200.125");
    expect(formatPercentage(12.5)).toBe("12.5%");
  });
});
