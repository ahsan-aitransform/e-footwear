"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { homeRouteForSession } from "@/lib/routing/homeRoute";
import type { DenyReason } from "@/lib/routing/routeAccessDecision";
import { useCurrentSession } from "@/lib/session/useSessionState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shown instead of a page the person may not open. Not a blank page: it says why and offers the way back.
export function AccessDeniedScreen({
  reason,
  missingPermissionCodes = [],
}: {
  reason: DenyReason;
  missingPermissionCodes?: readonly string[];
}) {
  const { translateMessage } = useTranslation();
  const session = useCurrentSession();
  const homeRoute = session ? homeRouteForSession(session) : ApplicationRoutes.home;

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-20 text-center">
      <ShieldAlert className="size-10 text-tone-danger-solid" aria-hidden="true" />
      <h1 className="text-xl font-semibold text-foreground">{translateMessage("accessDenied.title")}</h1>
      <p className="text-sm text-muted-foreground">
        {reason === "missingPermission"
          ? translateMessage("accessDenied.text")
          : translateMessage("accessDenied.notRegisteredText")}
      </p>
      {missingPermissionCodes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {translateMessage("accessDenied.missingPermissions", { permissions: missingPermissionCodes.join(", ") })}
        </p>
      )}
      <Link href={homeRoute} className={cn(buttonVariants({ variant: "outline" }), "mt-2")}>
        {translateMessage("accessDenied.goHome")}
      </Link>
    </div>
  );
}
