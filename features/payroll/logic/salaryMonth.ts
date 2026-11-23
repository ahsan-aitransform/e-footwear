import type { MessageKey } from "@/lib/i18n/messageKeys";

// A salary month is a year and a month (1 to 12). The server stores it as the first day of the month; any day of the month is accepted when asking.
export type SalaryMonth = { year: number; month: number };

export const salaryMonthMessageKeys: readonly MessageKey[] = [
  "payroll.month.january",
  "payroll.month.february",
  "payroll.month.march",
  "payroll.month.april",
  "payroll.month.may",
  "payroll.month.june",
  "payroll.month.july",
  "payroll.month.august",
  "payroll.month.september",
  "payroll.month.october",
  "payroll.month.november",
  "payroll.month.december",
];

export function currentSalaryMonth(now: Date = new Date()): SalaryMonth {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// { year: 2026, month: 10 } -> "2026-10-01"
export function salaryMonthToFirstDayIsoDate(salaryMonth: SalaryMonth): string {
  return `${String(salaryMonth.year).padStart(4, "0")}-${String(salaryMonth.month).padStart(2, "0")}-01`;
}

// "2026-10-17" -> { year: 2026, month: 10 }; null for text that is not a date.
export function salaryMonthFromIsoDate(isoDate: string): SalaryMonth | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(isoDate);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year: Number(match[1]), month } : null;
}

export function compareSalaryMonths(first: SalaryMonth, second: SalaryMonth): number {
  return first.year - second.year || first.month - second.month;
}

// The years offered in a month picker: a few before and one after the current year.
export function salaryYearOptions(now: Date = new Date(), yearsBefore = 3, yearsAfter = 1): number[] {
  const currentYear = now.getFullYear();
  return Array.from({ length: yearsBefore + yearsAfter + 1 }, (_, index) => currentYear - yearsBefore + index);
}

// "October 2026" in the language of the screen.
export function formatSalaryMonth(salaryMonth: SalaryMonth, translateMessage: (messageKey: MessageKey) => string): string {
  return `${translateMessage(salaryMonthMessageKeys[salaryMonth.month - 1])} ${salaryMonth.year}`;
}
