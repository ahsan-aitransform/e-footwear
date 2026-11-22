import { LanguageCodes, type LanguageCode } from "@/lib/constants/languageCodes";

// Dates and times of the security screens, in the language of the screen. The server sends UTC timestamps;
// the browser shows them in the local time zone.
const localeByLanguageCode: Record<LanguageCode, string> = {
  [LanguageCodes.english]: "en-GB",
  [LanguageCodes.urdu]: "ur-PK",
};

export function formatTimestamp(isoTimestamp: string | null | undefined, languageCode: LanguageCode): string {
  if (!isoTimestamp) return "";
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return new Intl.DateTimeFormat(localeByLanguageCode[languageCode], { dateStyle: "medium", timeStyle: "short" }).format(date);
}

// The start and the end of a calendar day as ISO timestamps (for the date filters of Users Activity).
export function startOfDayIsoTimestamp(dateText: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return undefined;
  return new Date(`${dateText}T00:00:00`).toISOString();
}

export function endOfDayIsoTimestamp(dateText: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return undefined;
  return new Date(`${dateText}T23:59:59.999`).toISOString();
}
