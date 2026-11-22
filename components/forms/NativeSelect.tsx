import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// The browser's own dropdown, styled with the design tokens. Use it for short fixed lists (role, language, page size);
// use SearchableSelect for long lists. Accepts <option> children.
export function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "block h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
