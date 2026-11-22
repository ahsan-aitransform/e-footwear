// THE ROUTE GUARD RULES, as one pure function (no React, no browser): given a path and the person who is
// signed in (or nobody), decide whether the page may be shown. The layouts apply the decision; the tests cover
// every cell of the matrix audience x signed-in x permission x temporary password.
//
// This is a convenience layer. A person who changes the stored session still gets nothing: the session is
// re-validated with GET /auth/me before any guarded page is shown, and the server checks audience, permission,
// company and store on every request.
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { findMissingPermissionCodes, satisfiesPermissionRequirement } from "@/lib/permissions/permissionChecks";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { homeRouteForSession, signInRouteForAudience } from "./homeRoute";
import { resolveRouteDefinition } from "./resolveRouteDefinition";
import type { ApplicationRouteDefinition, RouteAudience } from "./routeRegistry";

export type RedirectReason =
  | "unauthenticated"
  | "wrongAudience"
  | "mustChangePassword"
  | "temporaryPasswordAlreadyChanged"
  | "alreadySignedIn";

export type DenyReason = "routeNotRegistered" | "layoutAudienceMismatch" | "missingPermission";

export type RouteAccessDecision =
  | { kind: "allow"; route: ApplicationRouteDefinition }
  | { kind: "redirect"; destination: string; reason: RedirectReason; noticeMessageKey?: MessageKey }
  | { kind: "denyAccess"; reason: DenyReason; missingPermissionCodes: string[] };

export type RouteAccessInput = {
  pathname: string;
  // null = nobody is signed in.
  session: CurrentSessionResponse | null;
  // The audience of the layout that is asking. A route registered for another audience is a wiring mistake: deny.
  layoutAudience?: RouteAudience;
  // Defaults to the application's route registry. Tests pass their own.
  registry?: readonly ApplicationRouteDefinition[];
};

const NOT_AUTHORISED_NOTICE: MessageKey = "accessNotice.notAuthorisedForPage";

type SessionAudienceOfRoute = Exclude<RouteAudience, "public">;

function audienceOfSession(session: CurrentSessionResponse): SessionAudienceOfRoute {
  return session.audience === "PLATFORM_ADMINISTRATOR" ? "platformAdministrator" : "companyUser";
}

function decidePublicRoute(route: ApplicationRouteDefinition, session: CurrentSessionResponse | null): RouteAccessDecision {
  if (!session || !route.signedInUsersAreRedirected) return { kind: "allow", route };
  const isWrongPlaceForThisPerson =
    route.intendedAudience !== undefined && route.intendedAudience !== audienceOfSession(session);
  return {
    kind: "redirect",
    destination: homeRouteForSession(session),
    reason: isWrongPlaceForThisPerson ? "wrongAudience" : "alreadySignedIn",
    noticeMessageKey: isWrongPlaceForThisPerson ? NOT_AUTHORISED_NOTICE : undefined,
  };
}

function decideCompanyUserRoute(route: ApplicationRouteDefinition, session: CurrentSessionResponse): RouteAccessDecision {
  if (session.mustChangePassword && !route.allowedWhileTemporaryPassword) {
    return { kind: "redirect", destination: ApplicationRoutes.changePassword, reason: "mustChangePassword" };
  }
  if (!session.mustChangePassword && route.onlyWhileTemporaryPassword) {
    return { kind: "redirect", destination: ApplicationRoutes.companyDashboard, reason: "temporaryPasswordAlreadyChanged" };
  }

  const grantedPermissionCodes = new Set(session.grantedPermissionCodes);
  if (!satisfiesPermissionRequirement(grantedPermissionCodes, route.requiredPermissions)) {
    return {
      kind: "denyAccess",
      reason: "missingPermission",
      missingPermissionCodes: findMissingPermissionCodes(grantedPermissionCodes, route.requiredPermissions),
    };
  }
  return { kind: "allow", route };
}

function decideGuardedRoute(route: ApplicationRouteDefinition, session: CurrentSessionResponse | null): RouteAccessDecision {
  const routeAudience = route.audience as SessionAudienceOfRoute;
  if (!session) {
    return { kind: "redirect", destination: signInRouteForAudience(routeAudience), reason: "unauthenticated" };
  }
  if (audienceOfSession(session) !== routeAudience) {
    return {
      kind: "redirect",
      destination: homeRouteForSession(session),
      reason: "wrongAudience",
      noticeMessageKey: NOT_AUTHORISED_NOTICE,
    };
  }
  return routeAudience === "platformAdministrator" ? { kind: "allow", route } : decideCompanyUserRoute(route, session);
}

export function decideRouteAccess(input: RouteAccessInput): RouteAccessDecision {
  const route = resolveRouteDefinition(input.pathname, input.registry);
  if (!route) return { kind: "denyAccess", reason: "routeNotRegistered", missingPermissionCodes: [] };

  if (input.layoutAudience && route.audience !== input.layoutAudience) {
    return { kind: "denyAccess", reason: "layoutAudienceMismatch", missingPermissionCodes: [] };
  }

  return route.audience === "public" ? decidePublicRoute(route, input.session) : decideGuardedRoute(route, input.session);
}
