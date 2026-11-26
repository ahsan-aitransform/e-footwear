"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { PercentageField } from "@/components/forms/PercentageField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import type { PriceBandResponse } from "@/features/catalogue/types/catalogueTypes";
import type { MasterListOptionResponse } from "@/features/masterData/types/masterListTypes";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { showToast } from "@/lib/toast/toastStore";
import { translateValidationMessage } from "@/lib/validation/validationMessage";
import { describeCommission, describeDateRange } from "../logic/commissionFormatting";
import {
  buildSaveCommissionRuleRequest,
  hasCommissionRuleFormErrors,
  validateCommissionRuleForm,
  type CommissionRuleFormErrors,
  type CommissionRuleFormValues,
} from "../logic/commissionRuleFormValidation";
import {
  CommissionCalculationTypeCodes,
  CommissionRuleScopeCodes,
  commissionCalculationTypeCodeList,
  type CommissionPlanResponse,
  type CommissionRuleResponse,
  type EndCommissionRuleRequest,
} from "../types/commissionTypes";

function emptyRuleValues(): CommissionRuleFormValues {
  return {
    scopeCode: CommissionRuleScopeCodes.category,
    categoryId: "",
    priceBandId: "",
    calculationTypeCode: CommissionCalculationTypeCodes.percent,
    rate: null,
    fixedAmountPerPiece: null,
    minimumLineAmount: 0,
    priority: 0,
    validFrom: todayAsIsoDate(),
    validTo: "",
  };
}

// The rules of one plan (Part 16.2: eligible categories, price bands). A rule gives a category or price band its own rate; the most specific rule wins when a sold
// line matches several. A rule is ended, never edited, so the rate of a past day stays provable. Product rules are available on the API but not on this screen yet.
export function CommissionRulesDialog({
  plan,
  onClose,
  onChanged,
}: {
  plan: CommissionPlanResponse;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { translateMessage } = useTranslation();
  const categories = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.categories));
  const priceBands = useApiQuery<PriceBandResponse[]>(ApiEndpoints.priceBands.list);
  const [values, setValues] = useState<CommissionRuleFormValues>(emptyRuleValues);
  const [errors, setErrors] = useState<CommissionRuleFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [endingRuleId, setEndingRuleId] = useState<string | null>(null);
  const [endDate, setEndDate] = useState(todayAsIsoDate);
  const [endDateMessage, setEndDateMessage] = useState<string>();

  const isPercentage = values.calculationTypeCode === CommissionCalculationTypeCodes.percent;
  const scopeOptions: OptionSelectOption[] = [CommissionRuleScopeCodes.category, CommissionRuleScopeCodes.priceBand].map((code) => ({
    value: code,
    label: translateMessage(`commissions.rules.scope.${code}`),
  }));
  const categoryOptions: OptionSelectOption[] = (categories.data ?? []).map((category) => ({ value: category.id, label: category.name }));
  const priceBandOptions: OptionSelectOption[] = (priceBands.data ?? []).map((band) => ({ value: band.id, label: band.name }));
  const calculationTypeOptions: OptionSelectOption[] = commissionCalculationTypeCodeList.map((code) => ({ value: code, label: translateMessage(`commissions.calculationType.${code}`) }));
  const canEdit = requireAnyPermission(PermissionCodes.COMMISSIONS.COMMISSION_PLANS.EDIT);

  function change(changes: Partial<CommissionRuleFormValues>) {
    setValues((current) => ({ ...current, ...changes }));
  }

  function describeAbout(rule: CommissionRuleResponse): string {
    const about = rule.productName ?? rule.categoryName ?? rule.priceBandName ?? "";
    return `${translateMessage(`commissions.rules.scope.${rule.scopeCode as "PRODUCT" | "CATEGORY" | "PRICE_BAND"}`)}: ${about}`;
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateCommissionRuleForm(values);
    setErrors(found);
    if (hasCommissionRuleFormErrors(found)) return;
    setIsSaving(true);
    const result = await apiRequest<CommissionPlanResponse>(ApiEndpoints.commissions.planRules(plan.id), { method: "POST", body: buildSaveCommissionRuleRequest(values) });
    setIsSaving(false);
    if (!result.ok) return setMessage(result.problem.message);
    setMessage(undefined);
    setValues(emptyRuleValues());
    showToast(translateMessage("commissions.rules.toast.added"), ToneNames.success);
    onChanged();
  }

  async function handleEnd(ruleId: string) {
    if (endDate === "") return setEndDateMessage(translateMessage("commissions.rules.error.endDate"));
    const body: EndCommissionRuleRequest = { validTo: endDate };
    const result = await apiRequest<CommissionPlanResponse>(ApiEndpoints.commissions.endPlanRule(plan.id, ruleId), { method: "POST", body });
    if (!result.ok) return setEndDateMessage(result.problem.message);
    setEndingRuleId(null);
    setEndDateMessage(undefined);
    showToast(translateMessage("commissions.rules.toast.ended"), ToneNames.success);
    onChanged();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0 pe-8 pb-4">
          <DialogTitle>{translateMessage("commissions.rules.title", { name: plan.name })}</DialogTitle>
          <DialogDescription>{translateMessage("commissions.rules.description")}</DialogDescription>
        </DialogHeader>

        <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-1">
        {plan.rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">{translateMessage("commissions.rules.empty")}</p>
        ) : (
          <Table aria-label={translateMessage("commissions.rules.title", { name: plan.name })}>
            <TableHeader>
              <TableRow>
                <TableHead>{translateMessage("commissions.rules.column.about")}</TableHead>
                <TableHead>{translateMessage("commissions.rules.column.commission")}</TableHead>
                <TableHead className="text-end">{translateMessage("commissions.rules.column.minimum")}</TableHead>
                <TableHead>{translateMessage("commissions.rules.column.dates")}</TableHead>
                <TableHead className="text-end">{translateMessage("commissions.rules.column.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{describeAbout(rule)}</TableCell>
                  <TableCell>{describeCommission(translateMessage, rule.calculationTypeCode, rule.rate, rule.fixedAmountPerPiece)}</TableCell>
                  <TableCell className="text-end" dir="ltr">{rule.minimumLineAmount}</TableCell>
                  <TableCell dir="ltr">{describeDateRange(translateMessage, rule.validFrom, rule.validTo)}</TableCell>
                  <TableCell className="text-end">
                    <PermissionGate requirement={canEdit}>
                      {endingRuleId === rule.id ? (
                        <div className="flex flex-wrap items-end justify-end gap-2">
                          <DateField label={translateMessage("commissions.rules.endOn")} name={`commissionRuleEnd-${rule.id}`} value={endDate} onValueChange={setEndDate} errorMessage={endDateMessage} />
                          <Button type="button" size="sm" onClick={() => void handleEnd(rule.id)}>
                            {translateMessage("commissions.rules.endSubmit")}
                          </Button>
                        </div>
                      ) : (
                        <Button type="button" size="sm" variant="outline" onClick={() => { setEndingRuleId(rule.id); setEndDateMessage(undefined); }}>
                          {translateMessage("commissions.rules.end")}
                        </Button>
                      )}
                    </PermissionGate>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <PermissionGate requirement={canEdit}>
          <form onSubmit={handleAdd} className="space-y-4 border-t pt-4" noValidate>
            <h3 className="font-medium">{translateMessage("commissions.rules.add.title")}</h3>
            <FormResultNotice errorMessage={message} />
            {(categories.status === "error" || priceBands.status === "error") && <InlineNotice>{translateMessage("commissions.rules.loadFailed")}</InlineNotice>}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={translateMessage("commissions.rules.field.scope")} name="commissionRuleScope" isRequired>
                {(controlProps) => <OptionSelect {...controlProps} options={scopeOptions} value={values.scopeCode} onValueChange={(scopeCode) => change({ scopeCode })} />}
              </FormField>
              {values.scopeCode === CommissionRuleScopeCodes.category ? (
                <FormField label={translateMessage("commissions.rules.field.category")} name="commissionRuleCategory" isRequired errorMessage={translateValidationMessage(translateMessage, errors.about)}>
                  {(controlProps) => <OptionSelect {...controlProps} options={categoryOptions} value={values.categoryId} onValueChange={(categoryId) => change({ categoryId })} emptyOptionLabel={categoryOptions.length === 0 ? translateMessage("commissions.rules.noCategories") : undefined} />}
                </FormField>
              ) : (
                <FormField label={translateMessage("commissions.rules.field.priceBand")} name="commissionRulePriceBand" isRequired errorMessage={translateValidationMessage(translateMessage, errors.about)}>
                  {(controlProps) => <OptionSelect {...controlProps} options={priceBandOptions} value={values.priceBandId} onValueChange={(priceBandId) => change({ priceBandId })} emptyOptionLabel={priceBandOptions.length === 0 ? translateMessage("commissions.rules.noPriceBands") : undefined} />}
                </FormField>
              )}
              <FormField label={translateMessage("commissions.rules.field.calculationType")} name="commissionRuleCalculationType" isRequired>
                {(controlProps) => <OptionSelect {...controlProps} options={calculationTypeOptions} value={values.calculationTypeCode} onValueChange={(calculationTypeCode) => change({ calculationTypeCode })} />}
              </FormField>
              {isPercentage ? (
                <PercentageField label={translateMessage("commissions.rules.field.rate")} name="commissionRuleRate" isRequired value={values.rate} onValueChange={(rate) => change({ rate })} errorMessage={translateValidationMessage(translateMessage, errors.rate)} />
              ) : (
                <WholeRupeeAmountField label={translateMessage("commissions.rules.field.fixedAmount")} name="commissionRuleFixedAmount" isRequired value={values.fixedAmountPerPiece} onValueChange={(fixedAmountPerPiece) => change({ fixedAmountPerPiece })} errorMessage={translateValidationMessage(translateMessage, errors.fixedAmountPerPiece)} />
              )}
              <WholeRupeeAmountField label={translateMessage("commissions.rules.field.minimumLineAmount")} name="commissionRuleMinimumLine" value={values.minimumLineAmount} onValueChange={(minimumLineAmount) => change({ minimumLineAmount })} errorMessage={translateValidationMessage(translateMessage, errors.minimumLineAmount)} />
              <DateField label={translateMessage("commissions.rules.field.validFrom")} name="commissionRuleValidFrom" isRequired value={values.validFrom} onValueChange={(validFrom) => change({ validFrom })} errorMessage={translateValidationMessage(translateMessage, errors.validFrom)} />
              <DateField label={translateMessage("commissions.rules.field.validTo")} name="commissionRuleValidTo" value={values.validTo} onValueChange={(validTo) => change({ validTo })} errorMessage={translateValidationMessage(translateMessage, errors.validTo)} />
            </div>
            <SubmitButton label={translateMessage("commissions.rules.submit")} pendingLabel={translateMessage("common.pleaseWait")} isPending={isSaving} />
          </form>
        </PermissionGate>
        </div>
      </DialogContent>
    </Dialog>
  );
}
