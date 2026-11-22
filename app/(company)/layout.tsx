import type { ReactNode } from "react";
import { ApplicationShell } from "@/components/layout/ApplicationShell";
import { AudienceRouteGuard } from "@/components/permissions/AudienceRouteGuard";

// Route group "(company)": the application for company users. The guard keeps platform administrators and signed-out
// visitors out, sends people with a temporary password to /change-password, and checks the permissions of each route
// (lib/routing/routeRegistry.ts). Feature modules add their screens as folders in this group.
export const instant = false;

export default function CompanyAreaLayout({ children }: { children: ReactNode }) {
  return (
    <AudienceRouteGuard audience="companyUser">
      <ApplicationShell>{children}</ApplicationShell>
    </AudienceRouteGuard>
  );
}
