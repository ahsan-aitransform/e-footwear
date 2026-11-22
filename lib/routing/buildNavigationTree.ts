import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { satisfiesPermissionRequirement } from "@/lib/permissions/permissionChecks";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { navigationGroupDefinitions, type NavigationGroupCode } from "./navigationGroups";
import {
  applicationRouteRegistry,
  type ApplicationRouteDefinition,
  type NavigationIconName,
  type RouteAudience,
} from "./routeRegistry";

export type NavigationItem = {
  routeKey: string;
  href: string;
  labelMessageKey: MessageKey;
  iconName: NavigationIconName;
};

export type NavigationGroup = {
  groupCode: NavigationGroupCode;
  labelMessageKey: MessageKey;
  items: NavigationItem[];
};

// Menu entries only exist for static paths: a route with a dynamic segment has no single address to link to.
function hrefOf(route: ApplicationRouteDefinition): string | null {
  return route.pathPattern.includes("[") ? null : route.pathPattern;
}

// Builds the menu of one signed-in person: only routes of the person's audience, only those the person's permissions
// allow, grouped, in a stable order. The registry is the only input, so the menu cannot offer a route that is not guarded.
export function buildNavigationTree(
  session: CurrentSessionResponse,
  registry: readonly ApplicationRouteDefinition[] = applicationRouteRegistry,
): NavigationGroup[] {
  const audience: Exclude<RouteAudience, "public"> =
    session.audience === "PLATFORM_ADMINISTRATOR" ? "platformAdministrator" : "companyUser";
  const granted = new Set(session.grantedPermissionCodes);

  // A company user with a temporary password only sees the forced password change, never a menu.
  if (audience === "companyUser" && session.mustChangePassword) return [];

  const entries = registry
    .filter((route) => route.navigation && route.audience === audience)
    .filter((route) => audience === "platformAdministrator" || satisfiesPermissionRequirement(granted, route.requiredPermissions))
    .flatMap((route) => {
      const href = hrefOf(route);
      return href && route.navigation ? [{ route, href, navigation: route.navigation }] : [];
    });

  const byGroup = new Map<NavigationGroupCode, typeof entries>();
  for (const entry of entries) {
    const list = byGroup.get(entry.navigation.groupCode) ?? [];
    list.push(entry);
    byGroup.set(entry.navigation.groupCode, list);
  }

  return [...byGroup.entries()]
    .sort(([left], [right]) => navigationGroupDefinitions[left].sortOrder - navigationGroupDefinitions[right].sortOrder)
    .map(([groupCode, groupEntries]) => ({
      groupCode,
      labelMessageKey: navigationGroupDefinitions[groupCode].labelMessageKey,
      items: groupEntries
        .sort((left, right) => left.navigation.sortOrder - right.navigation.sortOrder)
        .map(({ route, href, navigation }) => ({
          routeKey: route.routeKey,
          href,
          labelMessageKey: navigation.labelMessageKey,
          iconName: navigation.iconName,
        })),
    }));
}

// The address of the first menu entry, used as a fallback home.
export function firstNavigationHref(groups: NavigationGroup[]): string {
  return groups[0]?.items[0]?.href ?? ApplicationRoutes.home;
}
