import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { buildNavigationTree } from "./buildNavigationTree";

// Where a signed-in person starts. Platform administrators have their own area; a company user with a temporary
// password may only change it; everyone else starts on New Sale. Without New Sale they start on the first other screen of
// their own menu, so nobody lands on a screen they may not open. Customers is never the start page, unless it is the only
// screen the person has. A person with no menu entry at all stays on "/", which then explains that nothing is available.
export function homeRouteForSession(session: CurrentSessionResponse): string {
  if (session.audience === "PLATFORM_ADMINISTRATOR") return ApplicationRoutes.platformCompanies;
  if (session.mustChangePassword) return ApplicationRoutes.changePassword;
  const menuPaths: string[] = buildNavigationTree(session).flatMap((group) => group.items.map((item) => item.href));
  return (
    menuPaths.find((path) => path === ApplicationRoutes.newSale) ??
    menuPaths.find((path) => path !== ApplicationRoutes.viewCustomers) ??
    menuPaths[0] ??
    ApplicationRoutes.home
  );
}

export function signInRouteForAudience(audience: "platformAdministrator" | "companyUser"): string {
  return audience === "platformAdministrator" ? ApplicationRoutes.platformSignIn : ApplicationRoutes.companySignIn;
}
