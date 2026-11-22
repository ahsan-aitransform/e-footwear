import type { ReactNode } from "react";
import { AudienceRouteGuard } from "@/components/permissions/AudienceRouteGuard";

// Route group "(public)": the sign-in pages. Anyone may open them; a person who is already signed in is sent to their
// own home instead. Opted out of instant-navigation validation because the guard is a client-side check that renders
// a loading state first (see FRONTEND-ARCHITECTURE.md).
export const instant = false;

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <AudienceRouteGuard audience="public">{children}</AudienceRouteGuard>;
}
