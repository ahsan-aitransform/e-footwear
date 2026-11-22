import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorageKeys } from "@/lib/constants/browserStorageKeys";
import { buildCompanyUserSession, buildPlatformAdministratorSession, TEST_STORE_ID } from "@/tests/support/sessionFixtures";
import {
  getSelectedStoreIdSnapshot,
  reconcileSelectedStoreWithSession,
  resetSelectedStoreStoreForTests,
  setSelectedStoreId,
} from "@/lib/session/selectedStoreStore";
import { buildPreHydrationScript } from "./preHydrationScript";
import { applyThemeToDocument, resolveIsDarkTheme, setThemePreference, ThemePreferences } from "./themeStore";

describe("theme", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
    vi.unstubAllGlobals();
  });

  it("dark is dark, light is light, system follows the device", () => {
    expect(resolveIsDarkTheme(ThemePreferences.dark, false)).toBe(true);
    expect(resolveIsDarkTheme(ThemePreferences.light, true)).toBe(false);
    expect(resolveIsDarkTheme(ThemePreferences.system, true)).toBe(true);
    expect(resolveIsDarkTheme(ThemePreferences.system, false)).toBe(false);
  });

  it("applies the dark class to <html> and remembers the choice", () => {
    setThemePreference(ThemePreferences.dark);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(LocalStorageKeys.themePreference)).toBe("dark");
    setThemePreference(ThemePreferences.light);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("'system' reads the device setting", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    applyThemeToDocument(ThemePreferences.system);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

describe("pre-hydration script", () => {
  it("is built from the same storage keys, directions and languages the application uses", () => {
    const script = buildPreHydrationScript();
    expect(script).toContain(LocalStorageKeys.languageCode);
    expect(script).toContain(LocalStorageKeys.themePreference);
    expect(script).toContain('"ur":"rtl"');
    expect(script).toContain('"en":"ltr"');
  });

  it("sets lang, dir and the dark class from saved preferences before the page paints", () => {
    window.localStorage.setItem(LocalStorageKeys.languageCode, "ur");
    window.localStorage.setItem(LocalStorageKeys.themePreference, "dark");
    new Function(buildPreHydrationScript())();
    expect(document.documentElement.lang).toBe("ur");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    document.documentElement.classList.remove("dark");
  });

  it("falls back to English left-to-right for an unsupported saved language", () => {
    window.localStorage.setItem(LocalStorageKeys.languageCode, "xx");
    new Function(buildPreHydrationScript())();
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
  });
});

describe("selected store", () => {
  beforeEach(() => resetSelectedStoreStoreForTests());

  it("keeps the choice in localStorage", () => {
    setSelectedStoreId(TEST_STORE_ID);
    expect(window.localStorage.getItem(LocalStorageKeys.selectedStoreId)).toBe(TEST_STORE_ID);
    setSelectedStoreId(null);
    expect(window.localStorage.getItem(LocalStorageKeys.selectedStoreId)).toBeNull();
  });

  it("forgets a store the person cannot access", () => {
    setSelectedStoreId("some-other-store");
    reconcileSelectedStoreWithSession(buildCompanyUserSession({ accessibleStoreIds: [TEST_STORE_ID, "third"] }));
    expect(getSelectedStoreIdSnapshot()).toBeNull();
  });

  it("works in the only store a person has", () => {
    reconcileSelectedStoreWithSession(buildCompanyUserSession({ accessibleStoreIds: [TEST_STORE_ID] }));
    expect(getSelectedStoreIdSnapshot()).toBe(TEST_STORE_ID);
  });

  it("leaves a person with several stores free to choose, and lets an owner of all stores pick any", () => {
    reconcileSelectedStoreWithSession(buildCompanyUserSession({ accessibleStoreIds: [TEST_STORE_ID, "b"] }));
    expect(getSelectedStoreIdSnapshot()).toBeNull();
    setSelectedStoreId("any-store");
    reconcileSelectedStoreWithSession(buildCompanyUserSession({ hasAccessToAllStores: true, accessibleStoreIds: [] }));
    expect(getSelectedStoreIdSnapshot()).toBe("any-store");
  });

  it("never keeps a store for a platform administrator", () => {
    setSelectedStoreId(TEST_STORE_ID);
    reconcileSelectedStoreWithSession(buildPlatformAdministratorSession());
    expect(getSelectedStoreIdSnapshot()).toBeNull();
  });
});
