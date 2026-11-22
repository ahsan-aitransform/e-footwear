import { describe, expect, it } from "vitest";
import { formatAmountWithSide, formatColumnAmount } from "./balanceFormatting";
import { formatPeriodMonth, isIsoDateRangeOrdered } from "./reportDates";

const words = { debit: "Dr", credit: "Cr" };

describe("balance formatting", () => {
  it("prints the amount and the side it stands on", () => {
    expect(formatAmountWithSide(45_000, "CREDIT", words)).toBe("Rs 45,000 Cr");
    expect(formatAmountWithSide(1_250_000, "DEBIT", words)).toBe("Rs 1,250,000 Dr");
  });

  it("prints a zero balance without a side", () => {
    expect(formatAmountWithSide(0, "DEBIT", words)).toBe("Rs 0");
  });

  it("leaves the empty side of a ledger line blank", () => {
    expect(formatColumnAmount(0)).toBe("");
    expect(formatColumnAmount(2_500)).toBe("Rs 2,500");
  });
});

describe("report dates", () => {
  it("orders ISO dates as text", () => {
    expect(isIsoDateRangeOrdered("2026-11-01", "2026-11-30")).toBe(true);
    expect(isIsoDateRangeOrdered("2026-11-30", "2026-11-30")).toBe(true);
    expect(isIsoDateRangeOrdered("2026-12-01", "2026-11-30")).toBe(false);
  });

  it("names a month in the active language", () => {
    expect(formatPeriodMonth("2026-11-01", "en")).toBe("November 2026");
  });
});
