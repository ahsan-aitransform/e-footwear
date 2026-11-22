"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { SettingsLimits } from "@/lib/constants/settingsLimits";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useIsOnline } from "@/lib/session/useSessionState";
import type { CreateManagedStoreRequest, StoreDetailResponse, UpdateManagedStoreRequest } from "@/lib/types/storeManagement";
import { nullableToText, textToNullable } from "../settingsFormValues";

// Creates a store (store === undefined) or edits one. The store code cannot change after creation.
export function ManagedStoreForm({
  store,
  onSaved,
  onCancel,
}: {
  store?: StoreDetailResponse;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const { translateMessage } = useTranslation();
  const isOnline = useIsOnline();
  const createMutation = useApiMutation<CreateManagedStoreRequest, { id: string }>(ApiEndpoints.storeManagement.create);
  const updateMutation = useApiMutation<UpdateManagedStoreRequest>(store ? ApiEndpoints.storeManagement.detail(store.id) : "", { method: "PUT" });
  const mutation = store ? updateMutation : createMutation;
  const [code, setCode] = useState("");
  const [name, setName] = useState(store?.name ?? "");
  const [address, setAddress] = useState(nullableToText(store?.address));
  const [phone, setPhone] = useState(nullableToText(store?.phone));
  const [wasSaved, setWasSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWasSaved(false);
    const result = store
      ? await updateMutation.execute({
          name: name.trim(),
          address: textToNullable(address),
          phone: textToNullable(phone),
          expectedRowVersion: store.rowVersion,
        })
      : await createMutation.execute({
          code: code.trim(),
          name: name.trim(),
          address: textToNullable(address),
          phone: textToNullable(phone),
        });
    if (!result.ok) return;
    setWasSaved(true);
    if (!store) {
      setCode("");
      setName("");
      setAddress("");
      setPhone("");
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      {!store && (
        <TextInputField
          label={translateMessage("settings.storeManagement.code")}
          name="storeCode"
          dir="ltr"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          maxLength={SettingsLimits.storeCodeMaximumLength}
          hint={translateMessage("settings.storeManagement.codeHint")}
          errorMessage={mutation.fieldErrorMessages.code}
          required
        />
      )}
      <TextInputField
        label={translateMessage("settings.storeManagement.name")}
        name="storeName"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={SettingsLimits.storeNameMaximumLength}
        errorMessage={mutation.fieldErrorMessages.name}
        required
      />
      <TextInputField
        label={translateMessage("settings.storeManagement.address")}
        name="storeAddress"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        maxLength={SettingsLimits.addressMaximumLength}
        errorMessage={mutation.fieldErrorMessages.address}
      />
      <TextInputField
        label={translateMessage("settings.storeManagement.phone")}
        name="storePhone"
        dir="ltr"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        maxLength={SettingsLimits.phoneNumberMaximumLength}
        errorMessage={mutation.fieldErrorMessages.phone}
      />
      <div className="space-y-3 sm:col-span-2">
        <FormResultNotice
          errorMessage={mutation.problem?.message}
          successMessage={wasSaved ? translateMessage(store ? "settings.storeManagement.updated" : "settings.storeManagement.created") : undefined}
        />
        <div className="flex gap-2">
          <SubmitButton
            label={translateMessage(store ? "common.save" : "settings.storeManagement.createSubmit")}
            pendingLabel={translateMessage("settings.common.saving")}
            isPending={mutation.isPending}
            isDisabled={!isOnline}
          />
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {translateMessage("common.cancel")}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
