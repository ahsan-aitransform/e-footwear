"use client";

import Link from "next/link";
import { Suspense } from "react";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { AuthenticationCardLayout } from "@/components/layout/AuthenticationCardLayout";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CompanySignInForm } from "../components/CompanySignInForm";

export function CompanySignInPage() {
  const { translateMessage } = useTranslation();
  return (
    <AuthenticationCardLayout
      title={translateMessage("security.companySignIn.title")}
      subtitle={translateMessage("security.companySignIn.subtitle")}
    >
      <Suspense fallback={<LoadingIndicator />}>
        <CompanySignInForm />
      </Suspense>
      <p className="text-sm">
        <Link href={ApplicationRoutes.forgotPassword} className="font-medium text-primary hover:underline">
          {translateMessage("securityManagement.forgotPassword.link")}
        </Link>
      </p>
      <p className="text-sm text-muted-foreground">
        {translateMessage("security.companySignIn.platformPrompt")}{" "}
        <Link href={ApplicationRoutes.platformSignIn} className="font-medium text-primary hover:underline">
          {translateMessage("security.companySignIn.platformLink")}
        </Link>
      </p>
    </AuthenticationCardLayout>
  );
}
