"use client";

import { AuthenticationCardLayout } from "@/components/layout/AuthenticationCardLayout";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";

export function ForgotPasswordPage() {
  const { translateMessage } = useTranslation();
  return (
    <AuthenticationCardLayout
      title={translateMessage("securityManagement.forgotPassword.title")}
      subtitle={translateMessage("securityManagement.forgotPassword.subtitle")}
    >
      <ForgotPasswordForm />
    </AuthenticationCardLayout>
  );
}
