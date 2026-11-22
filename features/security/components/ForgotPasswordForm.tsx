"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useIsOnline } from "@/lib/session/useSessionState";
import type { RequestPasswordResetRequest } from "@/lib/types/userManagement";

// Forgot password: ask for a reset token. The answer is always the same, whether or not the email has an account. How the token
// reaches the person is a business decision that is still open, so the page also points to the administrator.
export function ForgotPasswordForm() {
  const { translateMessage } = useTranslation();
  const isOnline = useIsOnline();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    if (!email.trim()) {
      setErrorMessage(translateMessage("securityManagement.userEditor.emailRequired"));
      return;
    }
    setIsSubmitting(true);
    const body: RequestPasswordResetRequest = { email: email.trim() };
    const result = await apiRequest(ApiEndpoints.authentication.requestPasswordReset, { method: "POST", body, authentication: "none" });
    setIsSubmitting(false);
    if (result.ok) setSuccessMessage(translateMessage("securityManagement.forgotPassword.sent"));
    else setErrorMessage(result.kind === "offline" ? translateMessage("securityManagement.userEditor.offlineError") : result.problem.message);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <TextInputField
        label={translateMessage("security.companySignIn.emailLabel")}
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <FormResultNotice errorMessage={errorMessage} successMessage={successMessage} />
      <SubmitButton
        label={translateMessage("securityManagement.forgotPassword.submit")}
        pendingLabel={translateMessage("security.createUser.submitting")}
        isPending={isSubmitting}
        isDisabled={!isOnline}
        isFullWidth
      />
      <p className="text-sm text-muted-foreground">
        <Link href={ApplicationRoutes.resetPassword} className="font-medium text-primary hover:underline">
          {translateMessage("securityManagement.forgotPassword.haveToken")}
        </Link>
        {" · "}
        <Link href={ApplicationRoutes.companySignIn} className="font-medium text-primary hover:underline">
          {translateMessage("securityManagement.forgotPassword.backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
