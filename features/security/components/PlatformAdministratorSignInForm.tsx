"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { homeRouteForSession } from "@/lib/routing/homeRoute";
import { startSession } from "@/lib/session/sessionStore";
import type {
  PlatformAdministratorLoginRequest,
  PlatformAdministratorLoginResponse,
} from "@/lib/types/authentication";

// Platform administrator (super admin) sign-in, in the browser. Needs a connection.
export function PlatformAdministratorSignInForm() {
  const router = useRouter();
  const { translateMessage } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!username || !password) {
      setErrorMessage(translateMessage("security.platformSignIn.enterUsernameAndPassword"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);
    try {
      const login = await apiRequest<PlatformAdministratorLoginResponse>(ApiEndpoints.platformAuthentication.login, {
        method: "POST",
        authentication: "none",
        body: { username, password } satisfies PlatformAdministratorLoginRequest,
      });
      if (!login.ok) {
        setErrorMessage(login.kind === "offline" ? translateMessage("security.platformSignIn.offline") : login.problem.message);
        return;
      }

      const started = await startSession(login.data.accessToken);
      if (!started.ok) {
        setErrorMessage(started.problem.message);
        return;
      }
      router.replace(homeRouteForSession(started.currentSession));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <TextInputField
        label={translateMessage("security.platformSignIn.usernameLabel")}
        name="username"
        autoComplete="username"
        required
      />
      <TextInputField
        label={translateMessage("security.platformSignIn.passwordLabel")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormResultNotice errorMessage={errorMessage} />
      <SubmitButton
        label={translateMessage("security.platformSignIn.submit")}
        pendingLabel={translateMessage("security.platformSignIn.submitting")}
        isPending={isSubmitting}
        isFullWidth
      />
    </form>
  );
}
