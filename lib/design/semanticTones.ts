// SINGLE SOURCE OF TRUTH FOR "WHAT COLOUR MEANS WHAT".
// A tone is a meaning (success, warning, ...), not a colour. The colour values live in app/globals.css as CSS
// variables; this file only maps each tone to the utility classes those variables generate. Components ask for a
// tone and never for a colour. Class names are written out in full so Tailwind can find them.

export const ToneNames = {
  neutral: "neutral",
  primary: "primary",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  highlight: "highlight",
} as const;

export type ToneName = (typeof ToneNames)[keyof typeof ToneNames];

// A small pill: soft background, readable text, thin ring.
export const toneBadgeClassNames: Record<ToneName, string> = {
  neutral: "bg-tone-neutral-background text-tone-neutral-foreground ring-tone-neutral-border",
  primary: "bg-tone-primary-background text-tone-primary-foreground ring-tone-primary-border",
  success: "bg-tone-success-background text-tone-success-foreground ring-tone-success-border",
  warning: "bg-tone-warning-background text-tone-warning-foreground ring-tone-warning-border",
  danger: "bg-tone-danger-background text-tone-danger-foreground ring-tone-danger-border",
  info: "bg-tone-info-background text-tone-info-foreground ring-tone-info-border",
  highlight: "bg-tone-highlight-background text-tone-highlight-foreground ring-tone-highlight-border",
};

// A message box (errors, confirmations, offline notice).
export const toneNoticeClassNames: Record<ToneName, string> = {
  neutral: "border-tone-neutral-border bg-tone-neutral-background text-tone-neutral-foreground",
  primary: "border-tone-primary-border bg-tone-primary-background text-tone-primary-foreground",
  success: "border-tone-success-border bg-tone-success-background text-tone-success-foreground",
  warning: "border-tone-warning-border bg-tone-warning-background text-tone-warning-foreground",
  danger: "border-tone-danger-border bg-tone-danger-background text-tone-danger-foreground",
  info: "border-tone-info-border bg-tone-info-background text-tone-info-foreground",
  highlight: "border-tone-highlight-border bg-tone-highlight-background text-tone-highlight-foreground",
};

// A filled dot (connection status, list markers).
export const toneDotClassNames: Record<ToneName, string> = {
  neutral: "bg-tone-neutral-solid",
  primary: "bg-tone-primary-solid",
  success: "bg-tone-success-solid",
  warning: "bg-tone-warning-solid",
  danger: "bg-tone-danger-solid",
  info: "bg-tone-info-solid",
  highlight: "bg-tone-highlight-solid",
};

// Status codes of the API (sec.users.status, platform.companies.status, ...) and the tone each one shows in.
const toneByStatusCode: Record<string, ToneName> = {
  ACTIVE: ToneNames.success,
  LOCKED: ToneNames.warning,
  DISABLED: ToneNames.danger,
  SUSPENDED: ToneNames.warning,
  CLOSED: ToneNames.danger,
};

export function toneForStatusCode(statusCode: string): ToneName {
  return toneByStatusCode[statusCode.toUpperCase()] ?? ToneNames.danger;
}
