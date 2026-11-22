"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { findRoleMessageKey } from "@/lib/i18n/roleMessageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import type { CreateUserRequest, CreateUserResponse, UserCreationOptionsResponse } from "@/lib/types/user";

const MINIMUM_PASSWORD_LENGTH = 8;

// Creates a user. The roles and stores offered come from the API, so the form only offers what the signed-in person may
// do; the API checks the choice again on submit. Creating users needs the server, so it is disabled offline.
// A platform administrator passes the companyId of the company the user belongs to; a company user never does.
export function CreateUserForm({
  companyId,
  options,
  isOnline,
  onCreated,
}: {
  companyId?: string;
  options: UserCreationOptionsResponse;
  isOnline: boolean;
  onCreated: () => void;
}) {
  const { translateMessage } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [fieldErrorMessages, setFieldErrorMessages] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (options.roles.length === 0) {
    return <p className="text-sm text-muted-foreground">{translateMessage("security.createUser.roleCannotCreate")}</p>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setIsSubmitting(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    setFieldErrorMessages({});
    try {
      const result = await apiRequest<CreateUserResponse>(ApiEndpoints.users.create, {
        method: "POST",
        idempotencyKey: createClientTransactionId(),
        body: {
          companyId: companyId ?? null,
          email: String(data.get("email") ?? "").trim(),
          fullName: String(data.get("fullName") ?? "").trim(),
          roleCode: String(data.get("roleCode") ?? ""),
          storeIds: data.getAll("storeIds").map(String),
          password: String(data.get("password") ?? ""),
        } satisfies CreateUserRequest,
      });
      if (!result.ok) {
        setErrorMessage(result.kind === "offline" ? translateMessage("security.createUser.offlineError") : result.problem.message);
        setFieldErrorMessages(result.problem.fieldErrorMessages);
        return;
      }
      form.reset();
      setSuccessMessage(translateMessage("security.createUser.success"));
      onCreated();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <TextInputField
        label={translateMessage("security.createUser.emailLabel")}
        name="email"
        type="email"
        autoComplete="off"
        hint={translateMessage("security.createUser.emailHint")}
        errorMessage={fieldErrorMessages.email}
        required
      />
      <TextInputField
        label={translateMessage("security.createUser.fullNameLabel")}
        name="fullName"
        errorMessage={fieldErrorMessages.fullName}
        required
      />

      <FormField
        label={translateMessage("security.createUser.roleLabel")}
        name="roleCode"
        errorMessage={fieldErrorMessages.roleCode}
        isRequired
      >
        {(controlProps) => (
          <NativeSelect {...controlProps} defaultValue={options.roles[0]} required>
            {options.roles.map((roleCode) => {
              const messageKey = findRoleMessageKey(roleCode);
              return (
                <option key={roleCode} value={roleCode}>
                  {messageKey ? translateMessage(messageKey) : roleCode}
                </option>
              );
            })}
          </NativeSelect>
        )}
      </FormField>

      <TextInputField
        label={translateMessage("security.createUser.passwordLabel")}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={MINIMUM_PASSWORD_LENGTH}
        errorMessage={fieldErrorMessages.password}
        required
      />

      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="text-sm font-medium text-foreground">{translateMessage("security.createUser.storesLegend")}</legend>
        {options.stores.length === 0 ? (
          <p className="text-sm text-muted-foreground">{translateMessage("security.createUser.noStores")}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {options.stores.map((store) => (
              <label
                key={store.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm text-foreground transition hover:border-ring has-[:checked]:border-primary has-[:checked]:bg-accent"
              >
                <input type="checkbox" name="storeIds" value={store.id} className="size-4 accent-primary" />
                <span>
                  {store.code} · {store.name}
                </span>
              </label>
            ))}
          </div>
        )}
        {fieldErrorMessages.storeIds && <p className="text-xs font-medium text-destructive">{fieldErrorMessages.storeIds}</p>}
      </fieldset>

      <div className="space-y-3 sm:col-span-2">
        {!isOnline && <InlineNotice tone={ToneNames.warning}>{translateMessage("security.createUser.offlineNotice")}</InlineNotice>}
        <FormResultNotice errorMessage={errorMessage} successMessage={successMessage} />
        <SubmitButton
          label={translateMessage("security.createUser.submit")}
          pendingLabel={translateMessage("security.createUser.submitting")}
          isPending={isSubmitting}
          isDisabled={!isOnline}
        />
      </div>
    </form>
  );
}
