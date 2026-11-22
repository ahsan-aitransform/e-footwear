"use client";

import { useEffect, useRef } from "react";
import type { SelectionState } from "../logic/permissionTreeSelection";

// A checkbox with three looks: empty, ticked, and indeterminate (partly ticked), for the permission tree (docx 1.2: a module that is
// only partly selected shows an indeterminate state). Clicking an indeterminate or empty box ticks it, a ticked one clears it.
export function TriStateCheckbox({
  selectionState,
  label,
  onToggle,
  isDisabled = false,
  className,
}: {
  selectionState: SelectionState;
  label: string;
  onToggle: () => void;
  isDisabled?: boolean;
  className?: string;
}) {
  const inputReference = useRef<HTMLInputElement>(null);

  // "indeterminate" is a property of the DOM element; it cannot be set with an attribute.
  useEffect(() => {
    if (inputReference.current) inputReference.current.indeterminate = selectionState === "partial";
  }, [selectionState]);

  return (
    <label className={`inline-flex items-center gap-2 text-sm ${isDisabled ? "opacity-60" : "cursor-pointer"} ${className ?? ""}`}>
      <input
        ref={inputReference}
        type="checkbox"
        className="size-4 accent-primary"
        checked={selectionState === "all"}
        aria-checked={selectionState === "partial" ? "mixed" : selectionState === "all"}
        disabled={isDisabled}
        onChange={onToggle}
      />
      <span>{label}</span>
    </label>
  );
}
