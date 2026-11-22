// Short messages that appear in a corner and disappear by themselves (a record was saved, a page was refused ...).
// An external store, so any code (a hook, a guard, a plain function) can show a toast without React state.
import type { ToneName } from "@/lib/design/semanticTones";

export type ToastMessage = {
  id: number;
  tone: ToneName;
  text: string;
};

export const TOAST_VISIBLE_MILLISECONDS = 6000;

const listeners = new Set<() => void>();
let toasts: readonly ToastMessage[] = [];
let nextToastId = 1;

function publish(next: readonly ToastMessage[]): void {
  toasts = next;
  listeners.forEach((listener) => listener());
}

export function getToastsSnapshot(): readonly ToastMessage[] {
  return toasts;
}

export function getServerToastsSnapshot(): readonly ToastMessage[] {
  return [];
}

export function subscribeToToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dismissToast(id: number): void {
  publish(toasts.filter((toast) => toast.id !== id));
}

export function showToast(text: string, tone: ToneName = "info"): number {
  const id = nextToastId++;
  publish([...toasts, { id, tone, text }]);
  if (typeof window !== "undefined") window.setTimeout(() => dismissToast(id), TOAST_VISIBLE_MILLISECONDS);
  return id;
}

export function clearToastsForTests(): void {
  toasts = [];
  listeners.forEach((listener) => listener());
}
