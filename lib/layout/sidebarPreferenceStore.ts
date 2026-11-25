// How the person likes the sidebar: collapsed to icons or not, and which menu groups they opened or closed by hand.
// Kept in localStorage, so it survives a sign-out like the language and theme do. An external store (not React state),
// so the shell and the menu read the same value.
import { LocalStorageKeys } from "@/lib/constants/browserStorageKeys";

export type SidebarPreference = {
  isCollapsed: boolean;
  // Menu groups the person opened (true) or closed (false) by hand, by group code. A group that is not listed follows the
  // default: open when it holds the page being shown.
  groupOpenStateByGroupCode: Readonly<Record<string, boolean>>;
};

// One shared object: React compares snapshots by identity, so the server snapshot and the "nothing stored" snapshot must
// be the same object on every call (a fresh object each time makes useSyncExternalStore loop).
const DEFAULT_SIDEBAR_PREFERENCE: SidebarPreference = { isCollapsed: false, groupOpenStateByGroupCode: {} };

const listeners = new Set<() => void>();
let cachedPreference: SidebarPreference | undefined;

function parseStoredPreference(rawValue: string | null): SidebarPreference {
  if (!rawValue) return DEFAULT_SIDEBAR_PREFERENCE;
  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_SIDEBAR_PREFERENCE;
    const { isCollapsed, groupOpenStateByGroupCode } = parsed as Partial<SidebarPreference>;
    const groupOpenState: Record<string, boolean> = {};
    if (typeof groupOpenStateByGroupCode === "object" && groupOpenStateByGroupCode !== null) {
      for (const [groupCode, isOpen] of Object.entries(groupOpenStateByGroupCode)) {
        if (typeof isOpen === "boolean") groupOpenState[groupCode] = isOpen;
      }
    }
    return { isCollapsed: isCollapsed === true, groupOpenStateByGroupCode: groupOpenState };
  } catch {
    return DEFAULT_SIDEBAR_PREFERENCE;
  }
}

function readStoredPreference(): SidebarPreference {
  try {
    return parseStoredPreference(window.localStorage.getItem(LocalStorageKeys.sidebarPreference));
  } catch {
    return DEFAULT_SIDEBAR_PREFERENCE;
  }
}

function publish(nextPreference: SidebarPreference): void {
  cachedPreference = nextPreference;
  try {
    window.localStorage.setItem(LocalStorageKeys.sidebarPreference, JSON.stringify(nextPreference));
  } catch {
    // storage unavailable: the choice lasts until the page closes
  }
  listeners.forEach((listener) => listener());
}

export function getSidebarPreferenceSnapshot(): SidebarPreference {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_PREFERENCE;
  if (cachedPreference === undefined) cachedPreference = readStoredPreference();
  return cachedPreference;
}

export function getServerSidebarPreferenceSnapshot(): SidebarPreference {
  return DEFAULT_SIDEBAR_PREFERENCE;
}

export function subscribeToSidebarPreference(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSidebarCollapsed(isCollapsed: boolean): void {
  const current = getSidebarPreferenceSnapshot();
  if (current.isCollapsed === isCollapsed) return;
  publish({ ...current, isCollapsed });
}

export function setSidebarGroupOpen(groupCode: string, isOpen: boolean): void {
  const current = getSidebarPreferenceSnapshot();
  if (current.groupOpenStateByGroupCode[groupCode] === isOpen) return;
  publish({ ...current, groupOpenStateByGroupCode: { ...current.groupOpenStateByGroupCode, [groupCode]: isOpen } });
}

// Test helper.
export function resetSidebarPreferenceStoreForTests(): void {
  cachedPreference = undefined;
  try {
    window.localStorage.removeItem(LocalStorageKeys.sidebarPreference);
  } catch {
    // nothing to clear
  }
}
