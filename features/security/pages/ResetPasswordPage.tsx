"use client";

import { AuthenticationCardLayout } from "@/components/layout/AuthenticationCardLayout";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ResetPasswordForm } from "../components/ResetPasswordForm";

export function ResetPasswordPage() {
  const { translateMessage } = useTranslation();
  return (
    <AuthenticationCardLayout
      title={translateMessage("securityManagement.resetPassword.title")}
      subtitle={translateMessage("securityManagement.resetPassword.subtitle")}
    >
      <ResetPasswordForm />
    </AuthenticationCardLayout>
  );
}
