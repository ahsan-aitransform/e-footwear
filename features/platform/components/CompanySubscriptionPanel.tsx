"use client";

import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { CompanyStatusCodes } from "@/lib/constants/settingsCodes";
import { SettingsLimits } from "@/lib/constants/settingsLimits";
import { ToneNames, toneForStatusCode } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type {
  AssignCompanyPlanRequest,
  CompanyDetailResponse,
  PlanResponse,
  SetCompanyStatusRequest,
} from "@/lib/types/platformAdministration";
import { TextAreaField } from "@/features/settings/components/TextAreaField";

// One company as the platform sees it: plan and usage against its limits, the plan assignment (subscription) and the status.
// A suspended or closed company cannot sign in and its open sessions end at once.
export function CompanySubscriptionPanel({ companyId }: { companyId: string }) {
  const { translateMessage } = useTranslation();
  const detail = useApiQuery<CompanyDetailResponse>(ApiEndpoints.platformCompanyAdministration.detail(companyId));
  const plans = useApiQuery<PlanResponse[]>(ApiEndpoints.platformPlans.list);
  const assignMutation = useApiMutation<AssignCompanyPlanRequest>(ApiEndpoints.platformCompanyAdministration.assignPlan(companyId), { method: "PUT" });
  const statusMutation = useApiMutation<SetCompanyStatusRequest>(ApiEndpoints.platformCompanyAdministration.setStatus(companyId));
  const [chosenPlanCode, setChosenPlanCode] = useState("");
  const [chosenStatus, setChosenStatus] = useState<string>(CompanyStatusCodes.active);
  const [reason, setReason] = useState("");
  const [isConfirmingStatus, setIsConfirmingStatus] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [statusSaved, setStatusSaved] = useState(false);

  if (detail.status === "loading" || plans.status === "loading") return <LoadingIndicator />;
  if (detail.status === "error" || !detail.data) {
    return <InlineNotice>{detail.isOffline ? translateMessage("errors.platformNeedsConnection") : detail.problem?.message}</InlineNotice>;
  }

  const { profile, usage } = detail.data;
  const selectedPlanCode = chosenPlanCode || profile.planCode;
  const assignablePlans = (plans.data ?? []).filter((plan) => plan.isActive || plan.code === profile.planCode);
  const statusNeedsConfirmation = chosenStatus !== CompanyStatusCodes.active;

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlanSaved(false);
    const result = await assignMutation.execute({ planCode: selectedPlanCode });
    if (!result.ok) return;
    setPlanSaved(true);
    detail.refetch();
    plans.refetch();
  }

  async function changeStatus() {
    setStatusSaved(false);
    const result = await statusMutation.execute({ status: chosenStatus, reason: reason.trim() === "" ? null : reason.trim() });
    setIsConfirmingStatus(false);
    if (!result.ok) return;
    setStatusSaved(true);
    setReason("");
    detail.refetch();
  }

  function handleStatusSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (statusNeedsConfirmation) setIsConfirmingStatus(true);
    else void changeStatus();
  }

  return (
    <SectionCard title={translateMessage("platform.subscription.title")} description={translateMessage("platform.subscription.description")}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span>
            {translateMessage("platform.subscription.plan")}: <strong>{usage.planName}</strong> ({usage.planCode})
          </span>
          <span>{translateMessage("platform.subscription.storesUsage", { used: usage.activeStores, maximum: usage.maximumStores })}</span>
          <span>{translateMessage("platform.subscription.usersUsage", { used: usage.users, maximum: usage.maximumUsers })}</span>
          <ToneBadge tone={toneForStatusCode(profile.status)}>{profile.status}</ToneBadge>
        </div>
        {(usage.activeStores > usage.maximumStores || usage.users > usage.maximumUsers) && (
          <InlineNotice tone={ToneNames.warning}>{translateMessage("platform.subscription.overLimit")}</InlineNotice>
        )}

        <form onSubmit={handleAssign} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <FormField label={translateMessage("platform.subscription.assignPlan")} name="assignPlan" errorMessage={assignMutation.fieldErrorMessages.planCode}>
            {(controlProps) => (
              <NativeSelect {...controlProps} value={selectedPlanCode} onChange={(event) => setChosenPlanCode(event.target.value)}>
                {assignablePlans.map((plan) => (
                  <option key={plan.code} value={plan.code}>
                    {plan.name} ({plan.code}): {plan.maximumStores} / {plan.maximumUsers}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <SubmitButton
            label={translateMessage("platform.subscription.assignSubmit")}
            pendingLabel={translateMessage("settings.common.saving")}
            isPending={assignMutation.isPending}
            isDisabled={selectedPlanCode === profile.planCode}
          />
          <div className="sm:col-span-2">
            <FormResultNotice
              errorMessage={assignMutation.problem?.message}
              successMessage={planSaved ? translateMessage("platform.subscription.planAssigned") : undefined}
            />
          </div>
        </form>

        <form onSubmit={handleStatusSubmit} className="space-y-3">
          <FormField label={translateMessage("platform.subscription.changeStatus")} name="companyStatus" errorMessage={statusMutation.fieldErrorMessages.status}>
            {(controlProps) => (
              <NativeSelect {...controlProps} value={chosenStatus} onChange={(event) => setChosenStatus(event.target.value)}>
                <option value={CompanyStatusCodes.active}>{translateMessage("common.status.active")}</option>
                <option value={CompanyStatusCodes.suspended}>{translateMessage("common.status.suspended")}</option>
                <option value={CompanyStatusCodes.closed}>{translateMessage("common.status.closed")}</option>
              </NativeSelect>
            )}
          </FormField>
          <TextAreaField
            label={translateMessage("platform.subscription.reason")}
            name="statusReason"
            hint={translateMessage("platform.subscription.reasonHint")}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={SettingsLimits.companyStatusReasonMaximumLength}
            errorMessage={statusMutation.fieldErrorMessages.reason}
          />
          <FormResultNotice
            errorMessage={statusMutation.problem?.message}
            successMessage={statusSaved ? translateMessage("platform.subscription.statusChanged") : undefined}
          />
          <Button type="submit" variant={statusNeedsConfirmation ? "destructive" : "default"} disabled={statusMutation.isPending || chosenStatus === profile.status}>
            {translateMessage("platform.subscription.statusSubmit")}
          </Button>
        </form>
      </div>
      <ConfirmDialog
        open={isConfirmingStatus}
        onOpenChange={setIsConfirmingStatus}
        isPending={statusMutation.isPending}
        titleMessageKey="platform.subscription.confirmTitle"
        descriptionMessageKey="platform.subscription.confirmText"
        confirmLabelMessageKey="platform.subscription.statusSubmit"
        onConfirm={() => void changeStatus()}
      />
    </SectionCard>
  );
}
