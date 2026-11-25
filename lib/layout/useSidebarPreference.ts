"use client";

import { useSyncExternalStore } from "react";
import {
  getServerSidebarPreferenceSnapshot,
  getSidebarPreferenceSnapshot,
  subscribeToSidebarPreference,
  type SidebarPreference,
} from "./sidebarPreferenceStore";

export function useSidebarPreference(): SidebarPreference {
  return useSyncExternalStore(subscribeToSidebarPreference, getSidebarPreferenceSnapshot, getServerSidebarPreferenceSnapshot);
}
