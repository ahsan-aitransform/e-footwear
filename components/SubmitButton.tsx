"use client";

import { useFormStatus } from "react-dom";

// Disables itself while the form is being submitted, so a double click cannot send the request twice.
// Server-action forms are detected automatically; client-side submits pass `pending` explicitly.
export function SubmitButton({
  label,
  pendingLabel = "Please wait...",
  pending: explicitPending,
}: {
  label: string;
  pendingLabel?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = explicitPending ?? status.pending;
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-black px-4 py-2 font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
