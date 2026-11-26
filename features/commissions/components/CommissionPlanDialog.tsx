"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { PercentageField } from "@/components/forms/PercentageField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAccessibleStores } from "@/features/accounting/hooks/useAccessibleStores";
import { todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { showToast } from "@/lib/toast/toastStore";
import { translateValidationMessage } from "@/lib/validation/validationMessage";
import {
  buildSaveCommissionPlanRequest,
  hasCommissionPlanFormErrors,
  validateCommissionPlanForm,
  type CommissionPlanFormErrors,
  type CommissionPlanFormValues,
} from "../logic/commissionPlanFormValidation";
import {
  CommissionBasisCodes,
  CommissionCalculationTypeCodes,
  CommissionPlanAppliesToCodes,
  commissionBasisCodeList,
  commissionCalculationTypeCodeList,
  commissionPlanAppliesToCodeList,
  type CommissionPlanResponse,
} from "../types/commissionTypes";
import { CommissionPlanMembersField } from "./CommissionPlanMembersField";

function valuesOfPlan(plan: CommissionPlanResponse | null): CommissionPlanFormValues {
  if (!plan) {
    return {
      name: "",
      appliesToCode: CommissionPlanAppliesToCodes.salesman,
      basisCode: CommissionBasisCodes.netSale,
      calculationTypeCode: CommissionCalculationTypeCodes.percent,
      defaultRate: null,
      defaultFixedAmountPerPiece: null,
      minimumStoreSales: 0,
      storeId: "",
      validFrom: todayAsIsoDate(),
      validTo: "",
      isActive: true,
      memberStaffIds: [],
    };
  }
  return {
    name: plan.name,
    appliesToCode: plan.appliesToCode,
    basisCode: plan.basisCode,
    calculationTypeCode: plan.calculationTypeCode,
    defaultRate: plan.defaultRate,
    defaultFixedAmountPerPiece: plan.defaultFixedAmountPerPiece,
    minimumStoreSales: plan.minimumStoreSales,
    storeId: plan.storeId ?? "",
    validFrom: plan.validFrom,
    validTo: plan.validTo ?? "",
    isActive: plan.isActive,
    memberStaffIds: plan.members.map((member) => member.staffId),
  };
}

// Creates or changes a commission plan (Part 16.2). A plan with one person chosen is a plan "for this salesman" (for example 3 percent of his sales); with nobody
// chosen it covers the whole role. The saved plan keeps its row version, so two people editing it cannot overwrite each other (a 409 asks to open it again).
// Mount it only while it is open: it starts from the plan it was given every time.
export function CommissionPlanDialog({
  plan,
  onClose,
  onSaved,
}: {
  plan: CommissionPlanResponse | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { translateMessage } = useTranslation();
  const { stores } = useAccessibleStores();
  const [values, setValues] = useState<CommissionPlanFormValues>(() => valuesOfPlan(plan));
  const [errors, setErrors] = useState<CommissionPlanFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();

  const isPercentage = values.calculationTypeCode === CommissionCalculationTypeCodes.percent;
  const isManagerPlan = values.appliesToCode === CommissionPlanAppliesToCodes.manager;
  const appliesToOptions: OptionSelectOption[] = commissionPlanAppliesToCodeList.map((code) => ({ value: code, label: translateMessage(`commissions.appliesTo.${code}`) }));
  const basisOptions: OptionSelectOption[] = commissionBasisCodeList.map((code) => ({ value: code, label: translateMessage(`commissions.basis.${code}`) }));
  const calculationTypeOptions: OptionSelectOption[] = commissionCalculationTypeCodeList.map((code) => ({ value: code, label: translateMessage(`commissions.calculationType.${code}`) }));
  const storeOptions: OptionSelectOption[] = stores.filter((store) => !store.isHeadOffice).map((store) => ({ value: store.id, label: store.name }));

  function change(changes: Partial<CommissionPlanFormValues>) {
    setValues((current) => ({ ...current, ...changes }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateCommissionPlanForm(values);
    setErrors(found);
    if (hasCommissionPlanFormErrors(found)) return;
    const body = buildSaveCommissionPlanRequest(values, plan?.rowVersion ?? null);
    setIsSaving(true);
    const result = plan
      ? await apiRequest<CommissionPlanResponse>(ApiEndpoints.commissions.planById(plan.id), { method: "PUT", body })
      : await apiRequest<CommissionPlanResponse>(ApiEndpoints.commissions.plans, { method: "POST", body });
    setIsSaving(false);
    if (!result.ok) return setMessage(result.kind === "conflict" ? translateMessage("commissions.planForm.conflict") : result.problem.message);
    showToast(translateMessage(plan ? "commissions.plans.toast.saved" : "commissions.plans.toast.created"), ToneNames.success);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4" noValidate>
          <DialogHeader className="shrink-0 pe-8">
            <DialogTitle>{plan ? translateMessage("commissions.planForm.editTitle", { name: plan.name }) : translateMessage("commissions.planForm.createTitle")}</DialogTitle>
            <DialogDescription>{translateMessage("commissions.planForm.description")}</DialogDescription>
          </DialogHeader>
          {/* Only the fields scroll: the title and the buttons stay in view on a short screen. */}
          <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-1">
          <FormResultNotice errorMessage={message} />
          <TextInputField
            label={translateMessage("commissions.planForm.name")}
            name="commissionPlanName"
            required
            value={values.name}
            onChange={(event) => change({ name: event.target.value })}
            errorMessage={translateValidationMessage(translateMessage, errors.name)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={translateMessage("commissions.planForm.appliesTo")} name="commissionPlanAppliesTo" isRequired hint={translateMessage("commissions.planForm.appliesToHint")} errorMessage={translateValidationMessage(translateMessage, errors.appliesToCode)}>
              {(controlProps) => <OptionSelect {...controlProps} options={appliesToOptions} value={values.appliesToCode} onValueChange={(appliesToCode) => change({ appliesToCode })} />}
            </FormField>
            <FormField label={translateMessage("commissions.planForm.basis")} name="commissionPlanBasis" isRequired hint={translateMessage("commissions.planForm.basisHint")} errorMessage={translateValidationMessage(translateMessage, errors.basisCode)}>
              {(controlProps) => <OptionSelect {...controlProps} options={basisOptions} value={values.basisCode} onValueChange={(basisCode) => change({ basisCode })} />}
            </FormField>
            <FormField label={translateMessage("commissions.planForm.calculationType")} name="commissionPlanCalculationType" isRequired errorMessage={translateValidationMessage(translateMessage, errors.calculationTypeCode)}>
              {(controlProps) => <OptionSelect {...controlProps} options={calculationTypeOptions} value={values.calculationTypeCode} onValueChange={(calculationTypeCode) => change({ calculationTypeCode })} />}
            </FormField>
            {isPercentage ? (
              <PercentageField
                label={translateMessage("commissions.planForm.rate")}
                name="commissionPlanRate"
                isRequired
                value={values.defaultRate}
                onValueChange={(defaultRate) => change({ defaultRate })}
                errorMessage={translateValidationMessage(translateMessage, errors.defaultRate)}
              />
            ) : (
              <WholeRupeeAmountField
                label={translateMessage("commissions.planForm.fixedAmount")}
                name="commissionPlanFixedAmount"
                isRequired
                value={values.defaultFixedAmountPerPiece}
                onValueChange={(defaultFixedAmountPerPiece) => change({ defaultFixedAmountPerPiece })}
                errorMessage={translateValidationMessage(translateMessage, errors.defaultFixedAmountPerPiece)}
              />
            )}
          </div>
          <CommissionPlanMembersField
            memberStaffIds={values.memberStaffIds}
            onMemberStaffIdsChange={(memberStaffIds) => change({ memberStaffIds })}
            knownMembers={plan?.members ?? []}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={translateMessage("commissions.planForm.store")} name="commissionPlanStore" hint={translateMessage("commissions.planForm.storeHint")}>
              {(controlProps) => (
                <OptionSelect {...controlProps} options={storeOptions} value={values.storeId} onValueChange={(storeId) => change({ storeId })} emptyOptionLabel={translateMessage("commissions.plans.allStores")} />
              )}
            </FormField>
            {isManagerPlan && (
              <WholeRupeeAmountField
                label={translateMessage("commissions.planForm.minimumStoreSales")}
                name="commissionPlanMinimumStoreSales"
                hint={translateMessage("commissions.planForm.minimumStoreSalesHint")}
                value={values.minimumStoreSales}
                onValueChange={(minimumStoreSales) => change({ minimumStoreSales })}
                errorMessage={translateValidationMessage(translateMessage, errors.minimumStoreSales)}
              />
            )}
            <DateField
              label={translateMessage("commissions.planForm.validFrom")}
              name="commissionPlanValidFrom"
              isRequired
              value={values.validFrom}
              onValueChange={(validFrom) => change({ validFrom })}
              errorMessage={translateValidationMessage(translateMessage, errors.validFrom)}
            />
            <DateField
              label={translateMessage("commissions.planForm.validTo")}
              name="commissionPlanValidTo"
              value={values.validTo}
              onValueChange={(validTo) => change({ validTo })}
              errorMessage={translateValidationMessage(translateMessage, errors.validTo)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="commission-plan-is-active" checked={values.isActive} onCheckedChange={(isActive) => change({ isActive })} />
            <Label htmlFor="commission-plan-is-active">{translateMessage("commissions.planForm.isActive")}</Label>
          </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              {translateMessage("common.cancel")}
            </Button>
            <SubmitButton
              label={translateMessage(plan ? "commissions.planForm.submitSave" : "commissions.planForm.submitCreate")}
              pendingLabel={translateMessage("common.pleaseWait")}
              isPending={isSaving}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
