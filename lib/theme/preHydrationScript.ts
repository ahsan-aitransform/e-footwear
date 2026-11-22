// A tiny script that runs while the browser parses the HTML, before the first paint, and sets what depends on the
// person's saved preferences: <html lang dir> (English or Urdu, left-to-right or right-to-left) and the dark theme class.
// Without it the page would first show English/light and then jump. Rendered once by app/layout.tsx.
// The names come from the constants, so the script cannot drift from the code that saves the preferences.
import { LocalStorageKeys } from "@/lib/constants/browserStorageKeys";
import { DEFAULT_LANGUAGE_CODE, supportedLanguageCodes, textDirectionByLanguageCode } from "@/lib/constants/languageCodes";
import { DARK_THEME_CLASS_NAME, ThemePreferences } from "./themeStore";

export function buildPreHydrationScript(): string {
  const configuration = {
    languageKey: LocalStorageKeys.languageCode,
    themeKey: LocalStorageKeys.themePreference,
    defaultLanguage: DEFAULT_LANGUAGE_CODE,
    supportedLanguages: supportedLanguageCodes,
    directions: textDirectionByLanguageCode,
    darkClass: DARK_THEME_CLASS_NAME,
    darkPreference: ThemePreferences.dark,
    systemPreference: ThemePreferences.system,
  };
  return `(function(){try{var c=${JSON.stringify(configuration)};var d=document.documentElement;var l=localStorage.getItem(c.languageKey);if(c.supportedLanguages.indexOf(l)<0)l=c.defaultLanguage;d.lang=l;d.dir=c.directions[l];var t=localStorage.getItem(c.themeKey)||c.systemPreference;var dark=t===c.darkPreference||(t===c.systemPreference&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark)d.classList.add(c.darkClass);}catch(e){}})();`;
}
