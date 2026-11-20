import type { ReactNode } from "react";
import { CompanyFrame } from "@/components/CompanyFrame";

// Server layout: the client guard inside CompanyFrame decides what is shown. Opted out of instant-navigation
// validation because the guard is a client-side check that renders a loading state first.
export const instant = false;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <CompanyFrame>{children}</CompanyFrame>;
}
