import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { buildNavigationTree } from "./buildNavigationTree";

// Where a signed-in person starts. Platform administrators have their own area; a company user with a temporary
// password may only change it; everyone else starts on the first screen of their own menu, so nobody lands on a screen
// they may not open. A person with no menu entry at all stays on "/", which then explains that nothing is available.
export function homeRouteForSession(session: CurrentSessionResponse): string {
  if (session.audience === "PLATFORM_ADMINISTRATOR") return ApplicationRoutes.platformCompanies;
  if (session.mustChangePassword) return ApplicationRoutes.changePassword;
  return buildNavigationTree(session)[0]?.items[0]?.href ?? ApplicationRoutes.home;
}

export function signInRouteForAudience(audience: "platformAdministrator" | "companyUser"): string {
  return audience === "platformAdministrator" ? ApplicationRoutes.platformSignIn : ApplicationRoutes.companySignIn;
}
