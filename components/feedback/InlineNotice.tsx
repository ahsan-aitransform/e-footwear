import type { ReactNode } from "react";
import { toneNoticeClassNames, ToneNames, type ToneName } from "@/lib/design/semanticTones";
import { cn } from "@/lib/utils";

const iconCharacterByTone: Partial<Record<ToneName, string>> = {
  danger: "!",
  warning: "!",
  success: "✓",
  info: "i",
};

// A message box inside a screen or form. Danger and warning notices are announced to screen readers at once
// (role="alert"); the others politely (role="status").
export function InlineNotice({
  tone = ToneNames.danger,
  children,
  className,
}: {
  tone?: ToneName;
  children: ReactNode;
  className?: string;
}) {
  const isUrgent = tone === ToneNames.danger || tone === ToneNames.warning;
  return (
    <p
      role={isUrgent ? "alert" : "status"}
      className={cn("flex gap-2 rounded-lg border px-3.5 py-2.5 text-sm", toneNoticeClassNames[tone], className)}
    >
      <span aria-hidden="true" className="mt-0.5 font-bold">
        {iconCharacterByTone[tone] ?? "•"}
      </span>
      <span>{children}</span>
    </p>
  );
}

// The two notices a form usually needs: an error and a success message. Renders nothing when both are empty.
export function FormResultNotice({ errorMessage, successMessage }: { errorMessage?: string; successMessage?: string }) {
  if (errorMessage) return <InlineNotice tone={ToneNames.danger}>{errorMessage}</InlineNotice>;
  if (successMessage) return <InlineNotice tone={ToneNames.success}>{successMessage}</InlineNotice>;
  return null;
}
