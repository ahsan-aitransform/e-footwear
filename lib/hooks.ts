"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "./api";

type Settled<T> = { key: string; data?: T; error?: ApiError | Error };

/**
 * Fetches on mount and whenever `deps` change; `skip` pauses it. Stale responses are ignored. While a new request is in
 * flight the previous data stays on screen (`loading` is true), so lists do not flash empty between pages.
 */
export function useQuery<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: unknown[], opts: { skip?: boolean } = {}) {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; });

  const key = `${JSON.stringify(deps)}#${tick}`;
  const skip = !!opts.skip;

  useEffect(() => {
    if (skip) return;
    const ctl = new AbortController();
    fetcherRef.current(ctl.signal)
      .then((data) => { if (!ctl.signal.aborted) setSettled({ key, data }); })
      .catch((error: Error) => { if (error.name !== "AbortError" && !ctl.signal.aborted) setSettled({ key, error }); });
    return () => ctl.abort();
  }, [key, skip]);

  const loading = !skip && settled?.key !== key;
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: settled?.data, error: settled?.key === key ? settled.error : undefined, loading, reload };
}

/** Run a mutation with loading + error state. */
export function useAction<A extends unknown[], R>(fn: (...a: A) => Promise<R>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | Error | undefined>(undefined);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  const run = useCallback(async (...a: A): Promise<R | undefined> => {
    setBusy(true);
    setError(undefined);
    try {
      return await fnRef.current(...a);
    } catch (e) {
      setError(e as Error);
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  const clear = useCallback(() => setError(undefined), []);
  return { run, busy, error, clear };
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Reads/writes one URL query parameter (ids and report keys live in the URL so pages are linkable). */
export function useParam(name: string): [string | null, (v: string | null) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const value = sp.get(name);
  const set = useCallback(
    (v: string | null) => {
      const p = new URLSearchParams(window.location.search);
      if (v === null || v === "") p.delete(name);
      else p.set(name, v);
      const s = p.toString();
      router.replace(`${window.location.pathname}${s ? `?${s}` : ""}`);
    },
    [name, router],
  );
  return [value, set];
}

/** Global keyboard shortcut. `combo` like "F10", "Ctrl+S", "Alt+N". */
export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void, enabled = true) {
  const h = useRef(handler);
  useEffect(() => { h.current = handler; });
  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split("+");
    const key = parts[parts.length - 1];
    const need = { ctrl: parts.includes("ctrl"), alt: parts.includes("alt"), shift: parts.includes("shift") };
    const fn = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key) return;
      if (e.ctrlKey !== need.ctrl || e.altKey !== need.alt || e.shiftKey !== need.shift) return;
      e.preventDefault();
      h.current(e);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [combo, enabled]);
}
