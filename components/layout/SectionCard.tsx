import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// A panel with an optional title, description and action (a button at the right of the title).
// isPadded = false lets a table run edge to edge.
export function SectionCard({
  title,
  description,
  action,
  children,
  isPadded = true,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  isPadded?: boolean;
}) {
  return (
    // The shadcn Card clips its content (overflow-hidden). A padded card holds forms, and a dropdown list opened near the
    // bottom of a form must be able to overlap what follows instead of being cut off at the card edge. An edge-to-edge
    // card (isPadded = false) holds a table and keeps the clipping so the table follows the rounded corners.
    <Card className={cn(isPadded ? "overflow-visible" : "gap-0 py-0")}>
      {(title || action) && (
        <CardHeader className={cn(!isPadded && "border-b py-4")}>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={cn(!isPadded && "px-0")}>{children}</CardContent>
    </Card>
  );
}
