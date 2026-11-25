import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorageKeys } from "@/lib/constants/browserStorageKeys";
import {
  getServerSidebarPreferenceSnapshot,
  getSidebarPreferenceSnapshot,
  resetSidebarPreferenceStoreForTests,
  setSidebarCollapsed,
  setSidebarGroupOpen,
  subscribeToSidebarPreference,
} from "./sidebarPreferenceStore";

beforeEach(() => resetSidebarPreferenceStoreForTests());

describe("sidebar preference store", () => {
  it("returns the same object from both snapshots until something changes (React compares them by identity)", () => {
    expect(getServerSidebarPreferenceSnapshot()).toBe(getServerSidebarPreferenceSnapshot());
    expect(getSidebarPreferenceSnapshot()).toBe(getSidebarPreferenceSnapshot());
    expect(getSidebarPreferenceSnapshot()).toBe(getServerSidebarPreferenceSnapshot());
  });

  it("starts expanded with no group chosen by hand", () => {
    expect(getSidebarPreferenceSnapshot()).toEqual({ isCollapsed: false, groupOpenStateByGroupCode: {} });
  });

  it("remembers collapsing in localStorage and tells subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSidebarPreference(listener);

    setSidebarCollapsed(true);

    expect(getSidebarPreferenceSnapshot().isCollapsed).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(LocalStorageKeys.sidebarPreference)!).isCollapsed).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setSidebarCollapsed(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does nothing, and does not notify, when the value did not change", () => {
    const listener = vi.fn();
    subscribeToSidebarPreference(listener);
    setSidebarCollapsed(false);
    setSidebarGroupOpen("PRODUCTS", false);
    setSidebarGroupOpen("PRODUCTS", false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("remembers which groups were opened or closed by hand", () => {
    setSidebarGroupOpen("PRODUCTS", false);
    setSidebarGroupOpen("VOUCHER", true);
    expect(getSidebarPreferenceSnapshot().groupOpenStateByGroupCode).toEqual({ PRODUCTS: false, VOUCHER: true });
  });

  it("reads a stored preference after a reload", () => {
    window.localStorage.setItem(
      LocalStorageKeys.sidebarPreference,
      JSON.stringify({ isCollapsed: true, groupOpenStateByGroupCode: { PRODUCTS: false, BAD: "yes" } }),
    );
    expect(getSidebarPreferenceSnapshot()).toEqual({ isCollapsed: true, groupOpenStateByGroupCode: { PRODUCTS: false } });
  });

  it("ignores a damaged stored value", () => {
    window.localStorage.setItem(LocalStorageKeys.sidebarPreference, "{not json");
    expect(getSidebarPreferenceSnapshot()).toEqual({ isCollapsed: false, groupOpenStateByGroupCode: {} });
  });
});
