import type { ReactNode } from "react";
import { toneBadgeClassNames, ToneNames, type ToneName } from "@/lib/design/semanticTones";
import { cn } from "@/lib/utils";

// A small pill that carries a meaning (success, warning, ...). The colours come from lib/design/semanticTones.ts.
export function ToneBadge({
  tone = ToneNames.neutral,
  children,
  className,
}: {
  tone?: ToneName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneBadgeClassNames[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
