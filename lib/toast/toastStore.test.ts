import { afterEach, describe, expect, it } from "vitest";
import {
  clearToastsForTests,
  dismissToast,
  getServerToastsSnapshot,
  getToastsSnapshot,
  showToast,
} from "./toastStore";

afterEach(() => clearToastsForTests());

describe("toast store snapshots (React compares them by identity)", () => {
  it("returns the same object from the server snapshot on every call", () => {
    expect(getServerToastsSnapshot()).toBe(getServerToastsSnapshot());
  });

  it("returns the same object from the client snapshot until a toast is added or removed", () => {
    expect(getToastsSnapshot()).toBe(getToastsSnapshot());

    const toastId = showToast("Saved");
    const withToast = getToastsSnapshot();
    expect(withToast).toHaveLength(1);
    expect(getToastsSnapshot()).toBe(withToast);

    dismissToast(toastId);
    expect(getToastsSnapshot()).toHaveLength(0);
  });
});
