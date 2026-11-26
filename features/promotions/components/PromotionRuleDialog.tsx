"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { PercentageField } from "@/components/forms/PercentageField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/api/apiRequest";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { showToast } from "@/lib/toast/toastStore";
import { translateValidationMessage } from "@/lib/validation/validationMessage";
import {
  buildSavePromotionRuleRequest,
  hasPromotionRuleFormErrors,
  validatePromotionRuleForm,
  type PromotionRuleFormErrors,
  type PromotionRuleFormValues,
} from "../logic/promotionFormValidation";
import { currentLocalInputValue, isoToLocalInputValue } from "../logic/promotionDateTime";
import { PromotionKindCodes, type PromotionKindCode, type PromotionRuleResponse } from "../types/promotionTypes";
import { PromotionCategoryCheckboxes } from "./PromotionCategoryCheckboxes";
import { PromotionStoreCheckboxes } from "./PromotionStoreCheckboxes";

function valuesOfRule(rule: PromotionRuleResponse | null): PromotionRuleFormValues {
  if (!rule) return { name: "", discountPercent: null, startsAt: currentLocalInputValue(), endsAt: "", isActive: true, storeIds: [], categoryIds: [] };
  return {
    name: rule.name,
    discountPercent: rule.discountPercent,
    startsAt: isoToLocalInputValue(rule.startsAt),
    endsAt: isoToLocalInputValue(rule.endsAt),
    isActive: rule.isActive,
    storeIds: rule.stores.map((store) => store.storeId),
    categoryIds: rule.categories.map((category) => category.categoryId),
  };
}

// Creates or changes a special offer, a sale on stores or a sale on categories (one dialog; the kind decides which fields it shows). The title and the buttons stay in view and
// only the fields scroll. The saved rule keeps its row version, so two people editing it cannot overwrite each other (a 409 asks to open it again).
// Mount it only while it is open: it starts from the rule it was given every time.
export function PromotionRuleDialog({
  kindCode,
  endpoint,
  endpointOfRule,
  rule,
  onClose,
  onSaved,
}: {
  kindCode: PromotionKindCode;
  endpoint: string;
  endpointOfRule: (ruleId: string) => string;
  rule: PromotionRuleResponse | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { translateMessage } = useTranslation();
  const [values, setValues] = useState<PromotionRuleFormValues>(() => valuesOfRule(rule));
  const [errors, setErrors] = useState<PromotionRuleFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();

  const isOffer = kindCode === PromotionKindCodes.specialOffer;
  const isCategorySale = kindCode === PromotionKindCodes.saleOnCategories;

  function change(changes: Partial<PromotionRuleFormValues>) {
    setValues((current) => ({ ...current, ...changes }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validatePromotionRuleForm(kindCode, values);
    setErrors(found);
    if (hasPromotionRuleFormErrors(found)) return;
    const body = buildSavePromotionRuleRequest(kindCode, values, rule?.rowVersion ?? null);
    setIsSaving(true);
    const result = rule
      ? await apiRequest<PromotionRuleResponse>(endpointOfRule(rule.id), { method: "PUT", body })
      : await apiRequest<PromotionRuleResponse>(endpoint, { method: "POST", body });
    setIsSaving(false);
    if (!result.ok) return setMessage(result.kind === "conflict" ? translateMessage("promotions.ruleForm.conflict") : result.problem.message);
    showToast(translateMessage(rule ? "promotions.ruleForm.toast.saved" : "promotions.ruleForm.toast.created"), ToneNames.success);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4" noValidate>
          <DialogHeader className="shrink-0 pe-8">
            <DialogTitle>
              {rule
                ? translateMessage(`promotions.ruleForm.editTitle.${kindCode}`, { name: rule.name })
                : translateMessage(`promotions.ruleForm.createTitle.${kindCode}`)}
            </DialogTitle>
            <DialogDescription>{translateMessage(`promotions.ruleForm.description.${kindCode}`)}</DialogDescription>
          </DialogHeader>
          <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-1">
            <FormResultNotice errorMessage={message} />
            <TextInputField
              label={translateMessage("promotions.ruleForm.name")}
              name="promotionName"
              required
              value={values.name}
              onChange={(event) => change({ name: event.target.value })}
              errorMessage={translateValidationMessage(translateMessage, errors.name)}
            />
            {!isOffer && (
              <PercentageField
                label={translateMessage("promotions.ruleForm.percentage")}
                name="promotionPercentage"
                isRequired
                value={values.discountPercent}
                onValueChange={(discountPercent) => change({ discountPercent })}
                errorMessage={translateValidationMessage(translateMessage, errors.discountPercent)}
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={translateMessage("promotions.ruleForm.startsAt")} name="promotionStartsAt" isRequired errorMessage={translateValidationMessage(translateMessage, errors.startsAt)}>
                {(controlProps) => <Input {...controlProps} type="datetime-local" value={values.startsAt} onChange={(event) => change({ startsAt: event.target.value })} />}
              </FormField>
              <FormField label={translateMessage("promotions.ruleForm.endsAt")} name="promotionEndsAt" errorMessage={translateValidationMessage(translateMessage, errors.endsAt)}>
                {(controlProps) => <Input {...controlProps} type="datetime-local" value={values.endsAt} onChange={(event) => change({ endsAt: event.target.value })} />}
              </FormField>
            </div>
            <div className="space-y-2">
              <Label>{translateMessage("promotions.ruleForm.stores")}</Label>
              <p className="text-sm text-muted-foreground">{translateMessage(`promotions.ruleForm.storesHint.${kindCode}`)}</p>
              <PromotionStoreCheckboxes
                idPrefix="promotion-store"
                storeIds={values.storeIds}
                onStoreIdsChange={(storeIds) => change({ storeIds })}
                errorMessage={translateValidationMessage(translateMessage, errors.storeIds)}
              />
            </div>
            {isCategorySale && (
              <div className="space-y-2">
                <Label>{translateMessage("promotions.ruleForm.categories")}</Label>
                <PromotionCategoryCheckboxes
                  categoryIds={values.categoryIds}
                  onCategoryIdsChange={(categoryIds) => change({ categoryIds })}
                  errorMessage={translateValidationMessage(translateMessage, errors.categoryIds)}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch id="promotion-is-active" checked={values.isActive} onCheckedChange={(isActive) => change({ isActive })} />
              <Label htmlFor="promotion-is-active">{translateMessage("promotions.ruleForm.isActive")}</Label>
            </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              {translateMessage("common.cancel")}
            </Button>
            <SubmitButton
              label={translateMessage(rule ? "promotions.ruleForm.submitSave" : "promotions.ruleForm.submitCreate")}
              pendingLabel={translateMessage("common.pleaseWait")}
              isPending={isSaving}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
