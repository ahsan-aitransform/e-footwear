"use client";

import { useCallback, type KeyboardEvent } from "react";

const FOCUSABLE_FIELD_SELECTOR = "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])";

// The docx general behaviour: Enter moves to the next field (the old data-entry screens are used with the keyboard). Put the returned
// handler on a <form>. It leaves alone anything that already handled the key (an open dropdown picks its option with Enter), buttons
// and multi-line text, and on the last field it lets the form submit.
export function useEnterMovesToNextField(): (event: KeyboardEvent<HTMLFormElement>) => void {
  return useCallback((event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    if (target instanceof HTMLInputElement && (target.type === "checkbox" || target.type === "submit" || target.type === "button")) return;
    if (target.getAttribute("role") === "combobox" && target.getAttribute("aria-expanded") === "true") return;

    const fields = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE_FIELD_SELECTOR)).filter(
      (field) => field.offsetParent !== null || field === target,
    );
    const index = fields.indexOf(target);
    const next = fields[index + 1];
    if (index === -1 || next === undefined) return;
    event.preventDefault();
    next.focus();
  }, []);
}
