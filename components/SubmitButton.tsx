"use client";

import { useFormStatus } from "react-dom";

// Primary action button. Disables itself while the form is being submitted, so a double click cannot send
// the request twice. Server-action forms are detected automatically; client-side submits pass `pending`.
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
  /** Blocks the button without showing the busy spinner (for example, while the device is offline). */
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const status = useFormStatus();
  const pending = explicitPending ?? status.pending;
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? "w-full" : "w-full sm:w-auto"}`}
    >
      {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {pending ? pendingLabel : label}
    </button>
  );
}
