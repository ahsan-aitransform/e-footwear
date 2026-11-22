"use client";

import { useEffect, type RefObject } from "react";

// The docx master screens say "Ctrl + F" puts the cursor in the search box. The browser's own find would open instead,
// so the key is taken over while a screen with a search box is open.
export function useFocusSearchWithControlF(containerReference: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "f") return;
      const searchBox = containerReference.current?.querySelector<HTMLInputElement>('input[type="search"]');
      if (!searchBox) return;
      event.preventDefault();
      searchBox.focus();
      searchBox.select();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [containerReference]);
}
