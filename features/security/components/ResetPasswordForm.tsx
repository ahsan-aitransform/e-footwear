"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useIsOnline } from "@/lib/session/useSessionState";
import type { CompletePasswordResetRequest } from "@/lib/types/userManagement";
import { findPasswordRuleViolation, MINIMUM_PASSWORD_LENGTH } from "../logic/temporaryPasswordRules";

// Sets a new password with a single-use reset token (from an administrator, or from the forgot-password request). The token works once,
// expires, and ends every session of the user. Afterwards the person signs in with the new password.
export function ResetPasswordForm() {
  const { translateMessage } = useTranslation();
  const router = useRouter();
  const isOnline = useIsOnline();
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatedPassword, setRepeatedPassword] = useState("");
  const [fieldErrorMessages, setFieldErrorMessages] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(undefined);
    const errors: Record<string, string> = {};
    if (!resetToken.trim()) errors.resetToken = translateMessage("securityManagement.resetPassword.tokenRequired");
    const violation = findPasswordRuleViolation(newPassword);
    if (violation === "tooShort") errors.newPassword = translateMessage("securityManagement.userEditor.passwordTooShort", { minimumLength: String(MINIMUM_PASSWORD_LENGTH) });
    else if (violation === "needsLettersAndDigits") errors.newPassword = translateMessage("securityManagement.userEditor.passwordNeedsLettersAndDigits");
    else if (violation === "tooLong") errors.newPassword = translateMessage("securityManagement.userEditor.passwordTooLong");
    if (!errors.newPassword && newPassword !== repeatedPassword) errors.repeatedPassword = translateMessage("security.changePassword.mismatch");
    setFieldErrorMessages(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    const body: CompletePasswordResetRequest = { resetToken: resetToken.trim(), newPassword };
    const result = await apiRequest(ApiEndpoints.authentication.completePasswordReset, { method: "POST", body, authentication: "none" });
    setIsSubmitting(false);
    if (result.ok) router.push(ApplicationRoutes.companySignInAfterPasswordChange);
    else setErrorMessage(result.kind === "offline" ? translateMessage("securityManagement.userEditor.offlineError") : result.problem.message);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <TextInputField
        label={translateMessage("securityManagement.resetPassword.tokenLabel")}
        name="resetToken"
        value={resetToken}
        onChange={(event) => setResetToken(event.target.value)}
        errorMessage={fieldErrorMessages.resetToken}
        autoComplete="off"
        dir="ltr"
        required
      />
      <TextInputField
        label={translateMessage("security.changePassword.newLabel")}
        name="newPassword"
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        hint={translateMessage("securityManagement.userEditor.passwordHint", { minimumLength: String(MINIMUM_PASSWORD_LENGTH) })}
        errorMessage={fieldErrorMessages.newPassword}
        required
      />
      <TextInputField
        label={translateMessage("security.changePassword.repeatLabel")}
        name="repeatedPassword"
        type="password"
        autoComplete="new-password"
        value={repeatedPassword}
        onChange={(event) => setRepeatedPassword(event.target.value)}
        errorMessage={fieldErrorMessages.repeatedPassword}
        required
      />
      <FormResultNotice errorMessage={errorMessage} />
      <SubmitButton
        label={translateMessage("securityManagement.resetPassword.submit")}
        pendingLabel={translateMessage("security.changePassword.submitting")}
        isPending={isSubmitting}
        isDisabled={!isOnline}
        isFullWidth
      />
    </form>
  );
}
