"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PASSWORD_CHANGED_QUERY_PARAMETER_NAME } from "@/lib/constants/applicationRoutes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { homeRouteForSession } from "@/lib/routing/homeRoute";
import { startSession } from "@/lib/session/sessionStore";
import type { CompanyLoginRequest, CompanyLoginResponse } from "@/lib/types/authentication";

// Company sign-in, in the browser. The access token is stored on the device (lib/session/sessionStore.ts).
// Signing in needs a connection; a device that is already signed in keeps working offline.
export function CompanySignInForm() {
  const router = useRouter();
  const searchParameters = useSearchParams();
  const { translateMessage } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setErrorMessage(translateMessage("security.companySignIn.enterEmailAndPassword"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);
    try {
      const login = await apiRequest<CompanyLoginResponse>(ApiEndpoints.authentication.companyLogin, {
        method: "POST",
        authentication: "none",
        body: { email, password } satisfies CompanyLoginRequest,
      });
      if (!login.ok) {
        setErrorMessage(login.kind === "offline" ? translateMessage("security.companySignIn.offline") : login.problem.message);
        return;
      }

      const started = await startSession(login.data.accessToken);
      if (!started.ok) {
        setErrorMessage(started.problem.message);
        return;
      }
      router.replace(homeRouteForSession(started.currentSession));
    } finally {
      // Always release the button, also after a successful sign-in: the next visit to this page must not find it spinning.
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {searchParameters.get(PASSWORD_CHANGED_QUERY_PARAMETER_NAME) === "1" && (
        <InlineNotice tone={ToneNames.success}>{translateMessage("security.companySignIn.passwordChangedNotice")}</InlineNotice>
      )}
      <TextInputField
        label={translateMessage("security.companySignIn.emailLabel")}
        name="email"
        type="email"
        autoComplete="email"
        placeholder={translateMessage("security.companySignIn.emailPlaceholder")}
        required
      />
      <TextInputField
        label={translateMessage("security.companySignIn.passwordLabel")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormResultNotice errorMessage={errorMessage} />
      <SubmitButton
        label={translateMessage("security.companySignIn.submit")}
        pendingLabel={translateMessage("security.companySignIn.submitting")}
        isPending={isSubmitting}
        isFullWidth
      />
    </form>
  );
}
