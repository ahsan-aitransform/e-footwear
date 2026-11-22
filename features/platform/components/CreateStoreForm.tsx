"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { apiRequest } from "@/lib/api/apiRequest";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CreateStoreRequest, CreateStoreResponse } from "@/lib/types/store";

const STORE_CODE_MAXIMUM_LENGTH = 20;
const NAME_MAXIMUM_LENGTH = 120;

// Adds a store to a company (platform administrators only). onCreated reloads the store list.
export function CreateStoreForm({ companyId, onCreated }: { companyId: string; onCreated: () => void }) {
  const { translateMessage } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [fieldErrorMessages, setFieldErrorMessages] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setIsSubmitting(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    setFieldErrorMessages({});
    try {
      const result = await apiRequest<CreateStoreResponse>(ApiEndpoints.platformCompanies.storesOfCompany(companyId), {
        method: "POST",
        idempotencyKey: createClientTransactionId(),
        body: {
          code: String(data.get("code") ?? "").trim(),
          name: String(data.get("name") ?? "").trim(),
        } satisfies CreateStoreRequest,
      });
      if (!result.ok) {
        setErrorMessage(result.kind === "offline" ? translateMessage("platform.createStore.offlineError") : result.problem.message);
        setFieldErrorMessages(result.problem.fieldErrorMessages);
        return;
      }
      form.reset();
      setSuccessMessage(translateMessage("platform.createStore.success"));
      onCreated();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
      <TextInputField
        label={translateMessage("platform.createStore.codeLabel")}
        name="code"
        maxLength={STORE_CODE_MAXIMUM_LENGTH}
        errorMessage={fieldErrorMessages.code}
        required
      />
      <div className="sm:col-span-2">
        <TextInputField
          label={translateMessage("platform.createStore.nameLabel")}
          name="name"
          maxLength={NAME_MAXIMUM_LENGTH}
          errorMessage={fieldErrorMessages.name}
          required
        />
      </div>
      <div className="space-y-3 sm:col-span-3">
        <FormResultNotice errorMessage={errorMessage} successMessage={successMessage} />
        <SubmitButton
          label={translateMessage("platform.createStore.submit")}
          pendingLabel={translateMessage("platform.createStore.submitting")}
          isPending={isSubmitting}
        />
      </div>
    </form>
  );
}
