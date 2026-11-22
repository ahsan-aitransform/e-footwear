"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { apiRequest } from "@/lib/api/apiRequest";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CreateCompanyRequest, CreateCompanyResponse } from "@/lib/types/company";

const DEFAULT_TIME_ZONE = "Asia/Karachi";
const MINIMUM_PASSWORD_LENGTH = 8;
const COMPANY_NAME_MAXIMUM_LENGTH = 120;
const STORE_CODE_MAXIMUM_LENGTH = 20;

// Registers a company with its first store and owner. The owner signs in with the temporary password set here.
export function CreateCompanyForm() {
  const router = useRouter();
  const { translateMessage } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [fieldErrorMessages, setFieldErrorMessages] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();

    setIsSubmitting(true);
    setErrorMessage(undefined);
    setFieldErrorMessages({});
    try {
      const result = await apiRequest<CreateCompanyResponse>(ApiEndpoints.platformCompanies.create, {
        method: "POST",
        idempotencyKey: createClientTransactionId(),
        body: {
          name: text("name"),
          timezone: text("timezone") || null,
          ownerEmail: text("ownerEmail"),
          ownerFullName: text("ownerFullName"),
          ownerPassword: String(form.get("ownerPassword") ?? ""),
          firstStoreCode: text("firstStoreCode"),
          firstStoreName: text("firstStoreName"),
        } satisfies CreateCompanyRequest,
      });
      if (!result.ok) {
        setErrorMessage(result.kind === "offline" ? translateMessage("platform.createCompany.offlineError") : result.problem.message);
        setFieldErrorMessages(result.problem.fieldErrorMessages);
        return;
      }
      router.push(ApplicationRoutes.platformCompanyDetail(result.data.companyId));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <TextInputField
          label={translateMessage("platform.createCompany.companyNameLabel")}
          name="name"
          maxLength={COMPANY_NAME_MAXIMUM_LENGTH}
          errorMessage={fieldErrorMessages.name}
          required
        />
      </div>
      <TextInputField
        label={translateMessage("platform.createCompany.timeZoneLabel")}
        name="timezone"
        defaultValue={DEFAULT_TIME_ZONE}
        errorMessage={fieldErrorMessages.timezone}
      />
      <div />
      <TextInputField
        label={translateMessage("platform.createCompany.ownerEmailLabel")}
        name="ownerEmail"
        type="email"
        autoComplete="off"
        errorMessage={fieldErrorMessages.ownerEmail}
        required
      />
      <TextInputField
        label={translateMessage("platform.createCompany.ownerFullNameLabel")}
        name="ownerFullName"
        errorMessage={fieldErrorMessages.ownerFullName}
        required
      />
      <div className="sm:col-span-2">
        <TextInputField
          label={translateMessage("platform.createCompany.ownerPasswordLabel")}
          name="ownerPassword"
          type="password"
          autoComplete="new-password"
          minLength={MINIMUM_PASSWORD_LENGTH}
          errorMessage={fieldErrorMessages.ownerPassword}
          required
        />
      </div>
      <TextInputField
        label={translateMessage("platform.createCompany.firstStoreCodeLabel")}
        name="firstStoreCode"
        maxLength={STORE_CODE_MAXIMUM_LENGTH}
        errorMessage={fieldErrorMessages.firstStoreCode}
        required
      />
      <TextInputField
        label={translateMessage("platform.createCompany.firstStoreNameLabel")}
        name="firstStoreName"
        maxLength={COMPANY_NAME_MAXIMUM_LENGTH}
        errorMessage={fieldErrorMessages.firstStoreName}
        required
      />
      <p className="text-xs text-muted-foreground sm:col-span-2">{translateMessage("platform.createCompany.hint")}</p>
      <div className="space-y-3 sm:col-span-2">
        <FormResultNotice errorMessage={errorMessage} />
        <SubmitButton
          label={translateMessage("platform.createCompany.submit")}
          pendingLabel={translateMessage("platform.createCompany.submitting")}
          isPending={isSubmitting}
        />
      </div>
    </form>
  );
}
