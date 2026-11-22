"use client";

import Link from "next/link";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { isQuickActionCode, quickActionRouteByCode } from "@/lib/constants/quickActionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { resolveRouteDefinition } from "@/lib/routing/resolveRouteDefinition";
import type { UserQuickActionsResponse } from "@/lib/types/userManagement";
import { quickActionMessageKey } from "./QuickActionsChecklist";

// The "Standard Menu" toolbar of the original system: the quick-action buttons an administrator ticked for this person. A button is
// shown only when its screen exists and the person may open it, so ticking a button never grants access. Nothing is shown when no
// button applies. Mounted in the application shell for company users.
export function QuickActionToolbar() {
  const { translateMessage } = useTranslation();
  const { satisfiesRequirement } = usePermissions();
  const quickActionsQuery = useApiQuery<UserQuickActionsResponse>(ApiEndpoints.account.quickActions, { offlineCacheName: "own-quick-actions" });

  const buttons = (quickActionsQuery.data?.actionCodes ?? []).flatMap((actionCode) => {
    if (!isQuickActionCode(actionCode)) return [];
    const route = quickActionRouteByCode[actionCode];
    if (!route) return [];
    const definition = resolveRouteDefinition(route);
    if (!definition || definition.audience !== "companyUser" || !satisfiesRequirement(definition.requiredPermissions)) return [];
    return [{ actionCode, route }];
  });

  if (buttons.length === 0) return null;
  return (
    <nav aria-label={translateMessage("securityManagement.quickActions.toolbarLabel")} className="flex flex-wrap gap-2 border-t px-4 py-2 sm:px-6">
      {buttons.map(({ actionCode, route }) => (
        <Link
          key={actionCode}
          href={route}
          className="inline-flex h-8 items-center rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          {translateMessage(quickActionMessageKey(actionCode))}
        </Link>
      ))}
    </nav>
  );
}
