"use client";

import { useId, useSyncExternalStore } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  getServerThemePreferenceSnapshot,
  getThemePreferenceSnapshot,
  isThemePreference,
  setThemePreference,
  subscribeToThemePreference,
  ThemePreferences,
} from "@/lib/theme/themeStore";

// Light, dark, or follow the device.
export function ThemeSwitch() {
  const { translateMessage } = useTranslation();
  const preference = useSyncExternalStore(subscribeToThemePreference, getThemePreferenceSnapshot, getServerThemePreferenceSnapshot);
  const selectId = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="sr-only">
        {translateMessage("shell.themeSwitchLabel")}
      </label>
      <select
        id={selectId}
        value={preference}
        onChange={(event) => {
          if (isThemePreference(event.target.value)) setThemePreference(event.target.value);
        }}
        className="h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
      >
        <option value={ThemePreferences.system}>{translateMessage("common.theme.system")}</option>
        <option value={ThemePreferences.light}>{translateMessage("common.theme.light")}</option>
        <option value={ThemePreferences.dark}>{translateMessage("common.theme.dark")}</option>
      </select>
    </div>
  );
}
