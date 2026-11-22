"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import { AccessDeniedScreen } from "@/components/feedback/AccessDeniedScreen";
import { FullPageLoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { rememberPendingAccessNotice } from "@/lib/routing/pendingAccessNotice";
import type { RouteAudience } from "@/lib/routing/routeRegistry";
import { useRouteAccessDecision } from "@/lib/routing/useRouteAccessDecision";
import { useSessionVerification } from "@/lib/session/useSessionVerification";

// THE ROUTE GUARD. Every route-group layout wraps its pages in this component and names the audience it serves:
//   (public)           audience "public"                 sign-in pages
//   (platform)         audience "platformAdministrator"  the super-admin area
//   (company)          audience "companyUser"            the application for company users
//
// What it does, in order (the rules themselves are in lib/routing/routeAccessDecision.ts, tested for every case):
//   1. while the session is being read or checked with the server: show only a loading state, never page content;
//   2. nobody signed in           -> redirect to the sign-in page of the audience;
//   3. the wrong kind of person   -> redirect to their own home, with a "not authorised" notice;
//   4. temporary password         -> only the forced password change is reachable;
//   5. missing permission         -> the Access denied screen (not a blank page);
//   6. a path missing from the route registry, or registered for another audience -> Access denied (deny by default);
//   7. otherwise the page.
// The browser only decides what to show. The server checks audience, permission, company and store on every request.
export function AudienceRouteGuard({ audience, children }: { audience: RouteAudience; children: ReactNode }) {
  // usePathname() depends on the request on dynamic routes (/platform/companies/[companyId]), so Cache Components needs a
  // Suspense boundary above it. The fallback is the same loading state the guard shows while the session is verified.
  return (
    <Suspense fallback={<FullPageLoadingIndicator />}>
      <AudienceRouteGuardContent audience={audience}>{children}</AudienceRouteGuardContent>
    </Suspense>
  );
}

function AudienceRouteGuardContent({ audience, children }: { audience: RouteAudience; children: ReactNode }) {
  useSessionVerification();
  const pathname = usePathname();
  const router = useRouter();
  const access = useRouteAccessDecision(pathname, audience);

  const redirect = access.status === "decided" && access.decision.kind === "redirect" ? access.decision : null;
  const redirectDestination = redirect?.destination ?? null;
  const redirectNoticeMessageKey = redirect?.noticeMessageKey ?? null;

  useEffect(() => {
    if (redirectDestination === null) return;
    if (redirectNoticeMessageKey) rememberPendingAccessNotice(redirectNoticeMessageKey);
    router.replace(redirectDestination);
  }, [redirectDestination, redirectNoticeMessageKey, router]);

  if (access.status === "checking" || redirect) return <FullPageLoadingIndicator />;

  if (access.decision.kind === "denyAccess") {
    return (
      <AccessDeniedScreen
        reason={access.decision.reason}
        missingPermissionCodes={access.decision.missingPermissionCodes}
      />
    );
  }

  return <>{children}</>;
}
