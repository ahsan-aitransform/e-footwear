// Small conversions between what a form field holds (always text) and what the settings API stores (null = not configured).

export function textToNullable(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

export function nullableToText(value: string | null | undefined): string {
  return value ?? "";
}

export type ParsedOptionalNumber = { isValid: true; value: number | null } | { isValid: false };

// An empty field means "not configured" (null). Anything else must be a finite number.
export function parseOptionalNumber(text: string): ParsedOptionalNumber {
  const trimmed = text.trim();
  if (trimmed === "") return { isValid: true, value: null };
  const value = Number(trimmed);
  return Number.isFinite(value) ? { isValid: true, value } : { isValid: false };
}

export function numberToText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

export const BooleanSelectValues = { notConfigured: "", yes: "true", no: "false" } as const;

export function booleanToSelectValue(value: boolean | null | undefined): string {
  if (value === true) return BooleanSelectValues.yes;
  if (value === false) return BooleanSelectValues.no;
  return BooleanSelectValues.notConfigured;
}

export function selectValueToBoolean(value: string): boolean | null {
  if (value === BooleanSelectValues.yes) return true;
  if (value === BooleanSelectValues.no) return false;
  return null;
}
