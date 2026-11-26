// Date and time of a promotion (docx 2.13: "From and To date with time"). The server keeps an absolute moment; the screen shows and edits it in the browser's own time zone
// through an <input type="datetime-local">, whose value is "yyyy-MM-ddTHH:mm" without a zone. [ARCHITECTURE DECISION REQUIRED] A company time zone for promotions (so every
// terminal reads the same hour) is not decided; until then the person's clock decides.

function pad(number: number): string {
  return String(number).padStart(2, "0");
}

// "2026-11-26T09:30" for the date-time field, from an ISO moment. "" for no moment.
export function isoToLocalInputValue(isoMoment: string | null | undefined): string {
  if (!isoMoment) return "";
  const moment = new Date(isoMoment);
  if (Number.isNaN(moment.getTime())) return "";
  return `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}T${pad(moment.getHours())}:${pad(moment.getMinutes())}`;
}

// The ISO moment (UTC) of what the person typed, or null when it is empty or not a real date and time.
export function localInputValueToIso(localValue: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue)) return null;
  const moment = new Date(localValue);
  return Number.isNaN(moment.getTime()) ? null : moment.toISOString();
}

// Now, as the value of the field (the default start of a new promotion).
export function currentLocalInputValue(): string {
  return isoToLocalInputValue(new Date().toISOString());
}

// "26 Nov 2026, 09:30" in the person's language for the lists.
export function formatPromotionMoment(isoMoment: string | null | undefined, languageCode: string): string {
  if (!isoMoment) return "";
  const moment = new Date(isoMoment);
  if (Number.isNaN(moment.getTime())) return isoMoment;
  return moment.toLocaleString(languageCode === "ur" ? "ur-PK" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
}
