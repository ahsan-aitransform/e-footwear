"use client";

import { X } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { toneNoticeClassNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  dismissToast,
  getServerToastsSnapshot,
  getToastsSnapshot,
  showToast,
  subscribeToToasts,
} from "@/lib/toast/toastStore";
import { cn } from "@/lib/utils";

// Shows the toasts. Mounted once in app/layout.tsx; show a toast from anywhere with useToast().showToast(...).
export function ToastProvider({ children }: { children: ReactNode }) {
  const toasts = useSyncExternalStore(subscribeToToasts, getToastsSnapshot, getServerToastsSnapshot);
  const { translateMessage } = useTranslation();

  return (
    <>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-end gap-2 p-4 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg",
              toneNoticeClassNames[toast.tone],
            )}
          >
            <span className="flex-1">{toast.text}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label={translateMessage("toast.dismiss")}
              className="rounded p-0.5 opacity-70 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

// Stable functions: safe to use in effects and callbacks.
export function useToast() {
  return { showToast, dismissToast };
}
