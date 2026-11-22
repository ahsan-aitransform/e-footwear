"use client";

import { AuthenticationCardLayout } from "@/components/layout/AuthenticationCardLayout";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ChangePasswordForm } from "../components/ChangePasswordForm";

export function ChangePasswordPage() {
  const { translateMessage } = useTranslation();
  return (
    <AuthenticationCardLayout
      title={translateMessage("security.changePassword.title")}
      subtitle={translateMessage("security.changePassword.subtitle")}
    >
      <ChangePasswordForm />
    </AuthenticationCardLayout>
  );
}
