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
import { endSession } from "@/lib/session/sessionStore";
import type { ChangePasswordRequest } from "@/lib/types/authentication";

const MINIMUM_PASSWORD_LENGTH = 8;

// Replaces a temporary password. Needs a connection. The server ends every session of the user on success,
// so the stored session is removed and the person signs in again.
export function ChangePasswordForm() {
  const router = useRouter();
  const { translateMessage } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("confirmPassword") ?? "");

    if (newPassword.length < MINIMUM_PASSWORD_LENGTH) {
      setErrorMessage(translateMessage("security.changePassword.tooShort"));
      return;
    }
    if (newPassword !== confirmation) {
      setErrorMessage(translateMessage("security.changePassword.mismatch"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);
    try {
      const result = await apiRequest(ApiEndpoints.authentication.changePassword, {
        method: "POST",
        body: { currentPassword, newPassword } satisfies ChangePasswordRequest,
      });
      if (!result.ok) {
        setErrorMessage(result.kind === "offline" ? translateMessage("security.changePassword.offline") : result.problem.message);
        return;
      }
      await endSession({ notifyServer: false });
      router.replace(ApplicationRoutes.companySignInAfterPasswordChange);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <TextInputField
        label={translateMessage("security.changePassword.currentLabel")}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
      />
      <TextInputField
        label={translateMessage("security.changePassword.newLabel")}
        name="newPassword"
        type="password"
        autoComplete="new-password"
        minLength={MINIMUM_PASSWORD_LENGTH}
        required
      />
      <TextInputField
        label={translateMessage("security.changePassword.repeatLabel")}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={MINIMUM_PASSWORD_LENGTH}
        required
      />
      <p className="text-xs text-muted-foreground">{translateMessage("security.changePassword.hint")}</p>
      <FormResultNotice errorMessage={errorMessage} />
      <SubmitButton
        label={translateMessage("security.changePassword.submit")}
        pendingLabel={translateMessage("security.changePassword.submitting")}
        isPending={isSubmitting}
        isFullWidth
      />
    </form>
  );
}
