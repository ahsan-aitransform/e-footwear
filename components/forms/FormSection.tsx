import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A titled group of fields inside a form. Uses a fieldset so screen readers announce the group name.
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("space-y-3", className)}>
      <legend className="text-sm font-semibold text-foreground">{title}</legend>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
