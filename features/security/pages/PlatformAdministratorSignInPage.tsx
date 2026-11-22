"use client";

import Link from "next/link";
import { AuthenticationCardLayout } from "@/components/layout/AuthenticationCardLayout";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { PlatformAdministratorSignInForm } from "../components/PlatformAdministratorSignInForm";

export function PlatformAdministratorSignInPage() {
  const { translateMessage } = useTranslation();
  return (
    <AuthenticationCardLayout
      title={translateMessage("security.platformSignIn.title")}
      subtitle={translateMessage("security.platformSignIn.subtitle")}
    >
      <PlatformAdministratorSignInForm />
      <p className="text-sm text-muted-foreground">
        {translateMessage("security.platformSignIn.companyPrompt")}{" "}
        <Link href={ApplicationRoutes.companySignIn} className="font-medium text-primary hover:underline">
          {translateMessage("security.platformSignIn.companyLink")}
        </Link>
      </p>
    </AuthenticationCardLayout>
  );
}
