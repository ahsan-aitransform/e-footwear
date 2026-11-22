import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import type { CurrentSessionResponse } from "@/lib/types/session";

// Where a signed-in person starts. Platform administrators have their own area; a company user with a temporary
// password may only change it; everyone else starts on the dashboard.
export function homeRouteForSession(session: CurrentSessionResponse): string {
  if (session.audience === "PLATFORM_ADMINISTRATOR") return ApplicationRoutes.platformCompanies;
  return session.mustChangePassword ? ApplicationRoutes.changePassword : ApplicationRoutes.companyDashboard;
}

export function signInRouteForAudience(audience: "platformAdministrator" | "companyUser"): string {
  return audience === "platformAdministrator" ? ApplicationRoutes.platformSignIn : ApplicationRoutes.companySignIn;
}
