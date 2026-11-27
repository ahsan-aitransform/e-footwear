"use client";

import { RoleCodes } from "@/lib/constants/roleCodes";
import { useCurrentSession } from "@/lib/session/useSessionState";

// Margin and markup are for the company owner only. It is a role rule, not a permission, so it cannot be granted to anyone else.
// The API leaves the figures out for other roles; this only hides the columns.
export function useCanViewMargin(): boolean {
  return useCurrentSession()?.roleCode === RoleCodes.companyOwner;
}
