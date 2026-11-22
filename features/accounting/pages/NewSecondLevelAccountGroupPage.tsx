"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { showToast } from "@/lib/toast/toastStore";
import type {
  AccountMainTypeResponse,
  CreateAccountGroupRequest,
  NextAccountGroupCodeResponse,
} from "../types/chartOfAccountsTypes";

// New Second Level (docx 2.3): choose the main type (Asset, Liability, Capital, Income, Expense), the next group code is shown,
// type the group name and save. The code follows the main type's digit prefix; the server decides the number.
export function NewSecondLevelAccountGroupPage() {
  const { translateMessage } = useTranslation();
  const [mainTypeCode, setMainTypeCode] = useState("");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [savedCounter, setSavedCounter] = useState(0);

  const mainTypes = useApiQuery<AccountMainTypeResponse[]>(ApiEndpoints.chartOfAccounts.mainTypes);
  const nextCode = useApiQuery<NextAccountGroupCodeResponse>(ApiEndpoints.chartOfAccounts.nextGroupCode, {
    query: { mainTypeCode, savedCounter },
    enabled: mainTypeCode !== "",
  });
  const create = useApiMutation<CreateAccountGroupRequest, NextAccountGroupCodeResponse>(ApiEndpoints.chartOfAccounts.groups);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (mainTypeCode === "") return setMessage(translateMessage("accounting.validation.mainTypeRequired"));
    if (name.trim() === "") return setNameError(translateMessage("accounting.validation.titleRequired"));
    setNameError(undefined);
    const result = await create.execute({ mainTypeCode, name: name.trim() });
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("accounting.toast.groupSaved", { code: result.data.groupCode }), ToneNames.success);
    setName("");
    setSavedCounter((counter) => counter + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.newSecondLevelAccountGroup")} subtitle={translateMessage("accounting.groups.newSubtitle")} />
      <div className="max-w-xl">
        <SectionCard>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FormField label={translateMessage("accounting.column.mainType")} name="mainTypeCode" isRequired>
              {(controlProps) => (
                <NativeSelect {...controlProps} value={mainTypeCode} onChange={(event) => setMainTypeCode(event.target.value)}>
                  <option value="">{translateMessage("masterData.choose")}</option>
                  {(mainTypes.data ?? []).map((mainType) => (
                    <option key={mainType.code} value={mainType.code}>
                      {mainType.displayName}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <TextInputField label={translateMessage("accounting.column.code")} name="groupCode" value={nextCode.data?.groupCode ?? ""} readOnly dir="ltr" />
            <TextInputField
              label={translateMessage("accounting.column.groupName")}
              name="groupName"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              errorMessage={nameError}
              maxLength={120}
            />
            <FormResultNotice errorMessage={message} />
            <SubmitButton label={translateMessage("masterData.action.save")} pendingLabel={translateMessage("masterData.action.saving")} isPending={create.isPending} />
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
