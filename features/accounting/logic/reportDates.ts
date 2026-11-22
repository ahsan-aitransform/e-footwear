// Business dates are plain calendar dates ("YYYY-MM-DD") in the user's own calendar; no time zone arithmetic is involved.

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayAsIsoDate(): string {
  return toIsoDate(new Date());
}

export function firstDayOfCurrentMonthAsIsoDate(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

// ISO dates compare correctly as text.
export function isIsoDateRangeOrdered(fromIsoDate: string, toIsoDate: string): boolean {
  return fromIsoDate <= toIsoDate;
}

// "2026-11-05" -> "November 2026" in the active language.
export function formatPeriodMonth(periodStartIsoDate: string, languageCode: string): string {
  const [year, month] = periodStartIsoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(languageCode, { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}
