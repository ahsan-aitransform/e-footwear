import type { ReactNode } from "react";
import { AudienceRouteGuard } from "@/components/permissions/AudienceRouteGuard";

// Route group "(company-account)": company-user pages that are shown without the application menu, such as the forced
// password change. Same guard as "(company)", no shell.
export const instant = false;

export default function CompanyAccountLayout({ children }: { children: ReactNode }) {
  return <AudienceRouteGuard audience="companyUser">{children}</AudienceRouteGuard>;
}
