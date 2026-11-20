import type { ReactNode } from "react";
import { AdminFrame } from "@/components/AdminFrame";

// Server layout: the client guard inside AdminFrame decides what is shown. Opted out of instant-navigation
// validation because the guard is a client-side check that renders a loading state first.
export const instant = false;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminFrame>{children}</AdminFrame>;
}
