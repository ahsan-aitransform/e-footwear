import { afterEach, describe, expect, it } from "vitest";
import { LanguageCodes } from "@/lib/constants/languageCodes";
import { LocalStorageKeys } from "@/lib/constants/browserStorageKeys";
import { englishMessages } from "./messages/en";
import { urduMessages } from "./messages/ur";
import { applyLanguageToDocument, getLanguageSnapshot, resetLanguageStoreForTests, setLanguage } from "./languageStore";
import { fillMessageParameters, translateMessageForLanguage } from "./translateMessage";
import type { MessageKey } from "./messageKeys";

describe("message catalogues", () => {
  const englishKeys = Object.keys(englishMessages) as MessageKey[];

  it("have the same keys in English and Urdu (a key missing in either language fails here)", () => {
    expect(Object.keys(urduMessages).sort()).toEqual([...englishKeys].sort());
  });

  it("have no empty text in either language", () => {
    for (const key of englishKeys) {
      expect(englishMessages[key].trim().length, `English ${key}`).toBeGreaterThan(0);
      expect(urduMessages[key].trim().length, `Urdu ${key}`).toBeGreaterThan(0);
    }
  });

  it("use the same {placeholders} in both languages", () => {
    const placeholdersOf = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const key of englishKeys) {
      expect(placeholdersOf(urduMessages[key]), key).toEqual(placeholdersOf(englishMessages[key]));
    }
  });

  it("follow the key naming rule <module>.<area>.<meaning>", () => {
    for (const key of englishKeys) expect(key, key).toMatch(/^[a-z][A-Za-z]*(\.[A-Za-z_]+)+$/);
  });
});

describe("translateMessageForLanguage", () => {
  it("fills {placeholders} and leaves an unknown one visible", () => {
    expect(fillMessageParameters("Page {page} of {pageCount}", { page: 2, pageCount: 9 })).toBe("Page 2 of 9");
    expect(fillMessageParameters("Hello {name}", {})).toBe("Hello {name}");
  });

  it("answers in the requested language", () => {
    expect(translateMessageForLanguage(LanguageCodes.english, "common.signOut")).toBe("Sign out");
    expect(translateMessageForLanguage(LanguageCodes.urdu, "common.signOut")).toBe("سائن آؤٹ");
  });
});

describe("language store", () => {
  afterEach(() => {
    resetLanguageStoreForTests();
    document.documentElement.lang = "";
    document.documentElement.dir = "";
  });

  it("defaults to English, remembers the choice and switches the page to right-to-left for Urdu", () => {
    expect(getLanguageSnapshot()).toBe(LanguageCodes.english);
    setLanguage(LanguageCodes.urdu);
    expect(window.localStorage.getItem(LocalStorageKeys.languageCode)).toBe("ur");
    expect(document.documentElement.lang).toBe("ur");
    expect(document.documentElement.dir).toBe("rtl");

    setLanguage(LanguageCodes.english);
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("ignores a stored value that is not a supported language", () => {
    window.localStorage.setItem(LocalStorageKeys.languageCode, "fr");
    resetLanguageStoreForTests();
    expect(getLanguageSnapshot()).toBe(LanguageCodes.english);
  });

  it("applyLanguageToDocument sets lang and dir without touching storage", () => {
    applyLanguageToDocument(LanguageCodes.urdu);
    expect(document.documentElement.dir).toBe("rtl");
    expect(window.localStorage.getItem(LocalStorageKeys.languageCode)).toBeNull();
  });
});
