// The chosen language, kept in localStorage so it survives sign-out. An external store (not React state) so that
// every component, and plain functions such as the API error mapper, read the same value.
import {
  DEFAULT_LANGUAGE_CODE,
  isSupportedLanguageCode,
  textDirectionByLanguageCode,
  type LanguageCode,
} from "@/lib/constants/languageCodes";
import { LocalStorageKeys } from "@/lib/constants/browserStorageKeys";

const listeners = new Set<() => void>();
let currentLanguageCode: LanguageCode | undefined;

function readStoredLanguageCode(): LanguageCode {
  try {
    const stored = window.localStorage.getItem(LocalStorageKeys.languageCode);
    return isSupportedLanguageCode(stored) ? stored : DEFAULT_LANGUAGE_CODE;
  } catch {
    return DEFAULT_LANGUAGE_CODE;
  }
}

export function getLanguageSnapshot(): LanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE_CODE;
  currentLanguageCode ??= readStoredLanguageCode();
  return currentLanguageCode;
}

export function getServerLanguageSnapshot(): LanguageCode {
  return DEFAULT_LANGUAGE_CODE;
}

export function subscribeToLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Sets lang and dir on <html> so layout, scrolling and text flow follow the language.
export function applyLanguageToDocument(languageCode: LanguageCode): void {
  document.documentElement.lang = languageCode;
  document.documentElement.dir = textDirectionByLanguageCode[languageCode];
}

export function setLanguage(languageCode: LanguageCode): void {
  currentLanguageCode = languageCode;
  try {
    window.localStorage.setItem(LocalStorageKeys.languageCode, languageCode);
  } catch {
    // storage unavailable: the choice lasts until the page closes
  }
  applyLanguageToDocument(languageCode);
  listeners.forEach((listener) => listener());
}

// Test helper: forgets the cached value so the next read goes to localStorage again.
export function resetLanguageStoreForTests(): void {
  currentLanguageCode = undefined;
}
