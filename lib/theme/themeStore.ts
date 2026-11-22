// The colour theme preference: light, dark, or follow the device. Kept in localStorage (it survives sign-out).
// The colours themselves are CSS variables in app/globals.css; the "dark" class on <html> switches them.
import { LocalStorageKeys } from "@/lib/constants/browserStorageKeys";

export const ThemePreferences = {
  light: "light",
  dark: "dark",
  system: "system",
} as const;

export type ThemePreference = (typeof ThemePreferences)[keyof typeof ThemePreferences];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = ThemePreferences.system;
export const DARK_THEME_CLASS_NAME = "dark";

const listeners = new Set<() => void>();
let currentPreference: ThemePreference | undefined;

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === ThemePreferences.light || value === ThemePreferences.dark || value === ThemePreferences.system;
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(LocalStorageKeys.themePreference);
    return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function getThemePreferenceSnapshot(): ThemePreference {
  if (typeof window === "undefined") return DEFAULT_THEME_PREFERENCE;
  currentPreference ??= readStoredPreference();
  return currentPreference;
}

export function getServerThemePreferenceSnapshot(): ThemePreference {
  return DEFAULT_THEME_PREFERENCE;
}

export function subscribeToThemePreference(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resolveIsDarkTheme(preference: ThemePreference, deviceIsDark: boolean): boolean {
  return preference === ThemePreferences.dark || (preference === ThemePreferences.system && deviceIsDark);
}

export function applyThemeToDocument(preference: ThemePreference): void {
  const deviceIsDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  document.documentElement.classList.toggle(DARK_THEME_CLASS_NAME, resolveIsDarkTheme(preference, deviceIsDark));
}

export function setThemePreference(preference: ThemePreference): void {
  currentPreference = preference;
  try {
    window.localStorage.setItem(LocalStorageKeys.themePreference, preference);
  } catch {
    // storage unavailable: the choice lasts until the page closes
  }
  applyThemeToDocument(preference);
  listeners.forEach((listener) => listener());
}
