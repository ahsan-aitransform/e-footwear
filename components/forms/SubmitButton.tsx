"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// The primary action button of a form. While isPending it shows a spinner and is disabled, so a double click cannot send
// the request twice. isDisabled blocks the button without the spinner (for example while offline).
export function SubmitButton({
  label,
  pendingLabel,
  isPending = false,
  isDisabled = false,
  isFullWidth = false,
}: {
  label: string;
  pendingLabel: string;
  isPending?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
}) {
  return (
    <Button type="submit" disabled={isPending || isDisabled} className={isFullWidth ? "w-full" : undefined}>
      {isPending && <Loader2 className="animate-spin" />}
      {isPending ? pendingLabel : label}
    </Button>
  );
}
