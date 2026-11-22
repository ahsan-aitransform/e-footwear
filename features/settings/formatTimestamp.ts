// A timestamp from the API (ISO text, UTC) as the person's local date and time; "-" when there is none.
export function formatTimestamp(isoTimestamp: string | null | undefined, emptyText: string): string {
  if (!isoTimestamp) return emptyText;
  const date = new Date(isoTimestamp);
  return Number.isNaN(date.getTime()) ? emptyText : date.toLocaleString();
}
