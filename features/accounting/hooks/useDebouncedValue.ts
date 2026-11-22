"use client";

import { useEffect, useState } from "react";

// The value, but only after it has stopped changing for the given time. Used so a search box asks the server once per pause, not once per keystroke.
export function useDebouncedValue<TValue>(value: TValue, delayMilliseconds: number): TValue {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMilliseconds);
    return () => clearTimeout(timer);
  }, [value, delayMilliseconds]);
  return debouncedValue;
}
