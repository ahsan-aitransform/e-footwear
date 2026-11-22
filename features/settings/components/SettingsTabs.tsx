"use client";

import { cn } from "@/lib/utils";

export type SettingsTab<TKey extends string> = { key: TKey; label: string };

// A row of tabs (Business Info / Preferences). The caller shows the panel of the active tab.
export function SettingsTabs<TKey extends string>({
  tabs,
  activeKey,
  onChange,
  ariaLabel,
}: {
  tabs: readonly SettingsTab<TKey>[];
  activeKey: TKey;
  onChange: (key: TKey) => void;
  ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-1 border-b">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
