"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { SettingsLimits } from "@/lib/constants/settingsLimits";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CreatePlanRequest, PlanResponse, UpdatePlanRequest } from "@/lib/types/platformAdministration";

// Creates a plan (plan === undefined) or edits one: name, limits and whether it can still be assigned. The code never changes.
export function PlanForm({ plan, onSaved, onCancel }: { plan?: PlanResponse; onSaved: () => void; onCancel?: () => void }) {
  const { translateMessage } = useTranslation();
  const createMutation = useApiMutation<CreatePlanRequest>(ApiEndpoints.platformPlans.create);
  const updateMutation = useApiMutation<UpdatePlanRequest>(plan ? ApiEndpoints.platformPlans.update(plan.code) : "", { method: "PUT" });
  const mutation = plan ? updateMutation : createMutation;
  const [code, setCode] = useState("");
  const [name, setName] = useState(plan?.name ?? "");
  const [maximumStores, setMaximumStores] = useState(String(plan?.maximumStores ?? ""));
  const [maximumUsers, setMaximumUsers] = useState(String(plan?.maximumUsers ?? ""));
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [wasSaved, setWasSaved] = useState(false);
  const [numberErrorMessage, setNumberErrorMessage] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWasSaved(false);
    const stores = Number(maximumStores);
    const users = Number(maximumUsers);
    if (!Number.isInteger(stores) || !Number.isInteger(users) || stores < 1 || users < 1) {
      setNumberErrorMessage(translateMessage("platform.plans.invalidLimits"));
      return;
    }
    setNumberErrorMessage(undefined);
    const result = plan
      ? await updateMutation.execute({ name: name.trim(), maximumStores: stores, maximumUsers: users, isActive })
      : await createMutation.execute({ code: code.trim().toUpperCase(), name: name.trim(), maximumStores: stores, maximumUsers: users });
    if (!result.ok) return;
    setWasSaved(true);
    if (!plan) {
      setCode("");
      setName("");
      setMaximumStores("");
      setMaximumUsers("");
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      {!plan && (
        <TextInputField
          label={translateMessage("platform.plans.code")}
          name="planCode"
          dir="ltr"
          hint={translateMessage("platform.plans.codeHint")}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          maxLength={30}
          errorMessage={mutation.fieldErrorMessages.code}
          required
        />
      )}
      <TextInputField
        label={translateMessage("platform.plans.name")}
        name="planName"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={SettingsLimits.planNameMaximumLength}
        errorMessage={mutation.fieldErrorMessages.name}
        required
      />
      <TextInputField
        label={translateMessage("platform.plans.maximumStores")}
        name="maximumStores"
        inputMode="numeric"
        dir="ltr"
        value={maximumStores}
        onChange={(event) => setMaximumStores(event.target.value)}
        errorMessage={mutation.fieldErrorMessages.maximumStores}
        required
      />
      <TextInputField
        label={translateMessage("platform.plans.maximumUsers")}
        name="maximumUsers"
        inputMode="numeric"
        dir="ltr"
        value={maximumUsers}
        onChange={(event) => setMaximumUsers(event.target.value)}
        errorMessage={mutation.fieldErrorMessages.maximumUsers}
        required
      />
      {plan && (
        <div className="flex items-center gap-2 sm:col-span-2">
          <Checkbox id="plan-is-active" checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
          <Label htmlFor="plan-is-active">{translateMessage("platform.plans.isActive")}</Label>
        </div>
      )}
      <div className="space-y-3 sm:col-span-2">
        <FormResultNotice
          errorMessage={numberErrorMessage ?? mutation.problem?.message}
          successMessage={wasSaved ? translateMessage(plan ? "platform.plans.updated" : "platform.plans.created") : undefined}
        />
        <div className="flex gap-2">
          <SubmitButton
            label={translateMessage(plan ? "common.save" : "platform.plans.createSubmit")}
            pendingLabel={translateMessage("settings.common.saving")}
            isPending={mutation.isPending}
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
