import { describe, expect, it } from "vitest";
import {
  compareSalaryMonths,
  currentSalaryMonth,
  formatSalaryMonth,
  salaryMonthFromIsoDate,
  salaryMonthMessageKeys,
  salaryMonthToFirstDayIsoDate,
  salaryYearOptions,
} from "./salaryMonth";

describe("salary months", () => {
  it("turns a month into its first day", () => {
    expect(salaryMonthToFirstDayIsoDate({ year: 2026, month: 10 })).toBe("2026-10-01");
    expect(salaryMonthToFirstDayIsoDate({ year: 2026, month: 1 })).toBe("2026-01-01");
  });

  it("reads the month of any day and refuses text that is not a date", () => {
    expect(salaryMonthFromIsoDate("2026-10-17")).toEqual({ year: 2026, month: 10 });
    expect(salaryMonthFromIsoDate("2026-13-01")).toBeNull();
    expect(salaryMonthFromIsoDate("October 2026")).toBeNull();
  });

  it("starts at the current month and orders months", () => {
    expect(currentSalaryMonth(new Date(2026, 9, 17))).toEqual({ year: 2026, month: 10 });
    expect(compareSalaryMonths({ year: 2026, month: 9 }, { year: 2026, month: 10 })).toBeLessThan(0);
    expect(compareSalaryMonths({ year: 2027, month: 1 }, { year: 2026, month: 12 })).toBeGreaterThan(0);
    expect(compareSalaryMonths({ year: 2026, month: 5 }, { year: 2026, month: 5 })).toBe(0);
  });

  it("offers a few years before and one after the current year", () => {
    expect(salaryYearOptions(new Date(2026, 5, 1))).toEqual([2023, 2024, 2025, 2026, 2027]);
  });

  it("has a message for each of the twelve months and writes the month with its year", () => {
    expect(salaryMonthMessageKeys).toHaveLength(12);
    expect(formatSalaryMonth({ year: 2026, month: 10 }, (messageKey) => `<${messageKey}>`)).toBe("<payroll.month.october> 2026");
  });
});
