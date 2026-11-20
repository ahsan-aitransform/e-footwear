"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

// Primary action button (shadcn Button). Disables itself while submitting, so a double click cannot send the
// request twice. Client-side submits pass `pending`; `disabled` blocks without the spinner (e.g. offline).
export function SubmitButton({
  label,
  pendingLabel = "Please wait...",
  pending: explicitPending,
  disabled = false,
  fullWidth = false,
}: {
  label: string;
  pendingLabel?: string;
  pending?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const status = useFormStatus();
  const pending = explicitPending ?? status.pending;
  return (
    <Button type="submit" disabled={pending || disabled} className={fullWidth ? "w-full" : undefined}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? pendingLabel : label}
    </Button>
  );
}
