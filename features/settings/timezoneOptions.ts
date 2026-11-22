const FALLBACK_TIMEZONES = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Istanbul",
  "America/New_York",
  "Africa/Cairo",
];

// The time zones to choose from: the browser's list of IANA names (the same names PostgreSQL accepts), plus UTC, plus the
// company's current value if it is not in the list. The database validates the chosen name.
export function getTimezoneOptions(currentValue: string): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  let names: string[];
  try {
    names = intl.supportedValuesOf ? intl.supportedValuesOf("timeZone") : FALLBACK_TIMEZONES;
  } catch {
    names = FALLBACK_TIMEZONES;
  }
  const unique = new Set<string>(["UTC", ...names]);
  if (currentValue) unique.add(currentValue);
  return [...unique].sort((first, second) => first.localeCompare(second));
}
