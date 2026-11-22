import type { ReactNode } from "react";
import { ApplicationShell } from "@/components/layout/ApplicationShell";
import { AudienceRouteGuard } from "@/components/permissions/AudienceRouteGuard";

// Route group "(platform)": the platform administration area (the super-admin routes under /platform).
// Only platform administrators get past the guard: a company user is sent back to their dashboard with a
// "not authorised" notice, and nobody signed in is sent to /platform/login. The API refuses these requests as well.
export const instant = false;

export default function PlatformAreaLayout({ children }: { children: ReactNode }) {
  return (
    <AudienceRouteGuard audience="platformAdministrator">
      <ApplicationShell>{children}</ApplicationShell>
    </AudienceRouteGuard>
  );
}
