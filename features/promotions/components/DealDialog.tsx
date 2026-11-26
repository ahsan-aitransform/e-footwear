"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { showToast } from "@/lib/toast/toastStore";
import { translateValidationMessage } from "@/lib/validation/validationMessage";
import { currentLocalInputValue, isoToLocalInputValue } from "../logic/promotionDateTime";
import {
  buildSaveDealRequest,
  dealLinesOfResponse,
  hasDealFormErrors,
  validateDealForm,
  type DealFormErrors,
  type DealFormValues,
} from "../logic/promotionFormValidation";
import type { DealResponse, DealVariantLookupResponse } from "../types/promotionTypes";
import { DealLinesGrid } from "./DealLinesGrid";

function valuesOfDeal(deal: DealResponse | null): DealFormValues {
  if (!deal) return { name: "", barcode: "", startsAt: currentLocalInputValue(), endsAt: "", isActive: true, lines: [] };
  return {
    name: deal.name,
    barcode: deal.barcode,
    startsAt: isoToLocalInputValue(deal.startsAt),
    endsAt: isoToLocalInputValue(deal.endsAt),
    isActive: deal.isActive,
    lines: dealLinesOfResponse(deal.lines),
  };
}

// Creates or changes a deal (docx 2.12): scan the products, set the quantity and the net price of each (the discount follows), and save. The deal gets its own barcode when none is
// typed. The title and the buttons stay in view and only the form scrolls. The saved deal keeps its row version (a 409 asks to open it again).
// Mount it only while it is open: it starts from the deal it was given every time.
export function DealDialog({ deal, onClose, onSaved }: { deal: DealResponse | null; onClose: () => void; onSaved: () => void }) {
  const { translateMessage } = useTranslation();
  const [values, setValues] = useState<DealFormValues>(() => valuesOfDeal(deal));
  const [errors, setErrors] = useState<DealFormErrors>({});
  const [scanText, setScanText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [scanMessage, setScanMessage] = useState<string>();

  function change(changes: Partial<DealFormValues>) {
    setValues((current) => ({ ...current, ...changes }));
  }

  async function handleScan() {
    const barcode = scanText.trim();
    if (barcode === "") return;
    setScanMessage(undefined);
    const result = await apiRequest<DealVariantLookupResponse>(ApiEndpoints.promotions.dealVariantByBarcode, { query: { barcode } });
    if (!result.ok) return setScanMessage(result.kind === "notFound" ? translateMessage("promotions.dealForm.lookupFailed") : result.problem.message);
    const found = result.data;
    if (values.lines.some((line) => line.variantId === found.variantId)) return setScanMessage(translateMessage("promotions.dealForm.alreadyInDeal"));
    change({
      lines: [
        ...values.lines,
        { variantId: found.variantId, barcode: found.barcode, productName: `${found.productName} (${found.productCode})`, sizeCode: found.sizeCode, quantity: 1, salePrice: found.salePrice, netUnitPrice: found.salePrice },
      ],
    });
    setScanText("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateDealForm(values);
    setErrors(found);
    if (hasDealFormErrors(found)) return;
    const body = buildSaveDealRequest(values, deal?.rowVersion ?? null);
    setIsSaving(true);
    const result = deal
      ? await apiRequest<DealResponse>(ApiEndpoints.promotions.dealById(deal.id), { method: "PUT", body })
      : await apiRequest<DealResponse>(ApiEndpoints.promotions.deals, { method: "POST", body });
    setIsSaving(false);
    if (!result.ok) return setMessage(result.kind === "conflict" && deal ? translateMessage("promotions.dealForm.conflict") : result.problem.message);
    showToast(translateMessage(deal ? "promotions.dealForm.toast.saved" : "promotions.dealForm.toast.created"), ToneNames.success);
    onSaved();
  }

  const lineMessages = errors.lineMessages
    ? Object.fromEntries(Object.entries(errors.lineMessages).map(([variantId, validation]) => [variantId, translateValidationMessage(translateMessage, validation) ?? ""]))
    : undefined;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden sm:max-w-5xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4" noValidate>
          <DialogHeader className="shrink-0 pe-8">
            <DialogTitle>{deal ? translateMessage("promotions.dealForm.editTitle", { name: deal.name }) : translateMessage("promotions.dealForm.createTitle")}</DialogTitle>
            <DialogDescription>{translateMessage("promotions.dealForm.description")}</DialogDescription>
          </DialogHeader>
          <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-1">
            <FormResultNotice errorMessage={message} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInputField
                label={translateMessage("promotions.dealForm.name")}
                name="dealName"
                required
                value={values.name}
                onChange={(event) => change({ name: event.target.value })}
                errorMessage={translateValidationMessage(translateMessage, errors.name)}
              />
              <TextInputField
                label={translateMessage("promotions.dealForm.barcode")}
                name="dealBarcode"
                hint={translateMessage("promotions.dealForm.barcodeHint")}
                autoComplete="off"
                dir="ltr"
                value={values.barcode}
                onChange={(event) => change({ barcode: event.target.value })}
                errorMessage={translateValidationMessage(translateMessage, errors.barcode)}
              />
              <FormField label={translateMessage("promotions.dealForm.startsAt")} name="dealStartsAt" isRequired errorMessage={translateValidationMessage(translateMessage, errors.startsAt)}>
                {(controlProps) => <Input {...controlProps} type="datetime-local" value={values.startsAt} onChange={(event) => change({ startsAt: event.target.value })} />}
              </FormField>
              <FormField label={translateMessage("promotions.dealForm.endsAt")} name="dealEndsAt" errorMessage={translateValidationMessage(translateMessage, errors.endsAt)}>
                {(controlProps) => <Input {...controlProps} type="datetime-local" value={values.endsAt} onChange={(event) => change({ endsAt: event.target.value })} />}
              </FormField>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="deal-is-active" checked={values.isActive} onCheckedChange={(isActive) => change({ isActive })} />
              <Label htmlFor="deal-is-active">{translateMessage("promotions.dealForm.isActive")}</Label>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-64 flex-1">
                <FormField label={translateMessage("promotions.dealForm.scan")} name="dealScan" errorMessage={scanMessage}>
                  {(controlProps) => (
                    <Input
                      {...controlProps}
                      autoComplete="off"
                      dir="ltr"
                      value={scanText}
                      onChange={(event) => setScanText(event.target.value)}
                      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleScan(); } }}
                    />
                  )}
                </FormField>
              </div>
              <Button type="button" variant="outline" onClick={() => void handleScan()}>
                {translateMessage("promotions.dealForm.addLine")}
              </Button>
            </div>
            {errors.lines && <p role="alert" className="text-sm text-destructive">{translateValidationMessage(translateMessage, errors.lines)}</p>}
            <DealLinesGrid lines={values.lines} onLinesChange={(lines) => change({ lines })} lineMessages={lineMessages} />
          </div>
          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              {translateMessage("common.cancel")}
            </Button>
            <SubmitButton
              label={translateMessage(deal ? "promotions.dealForm.submitSave" : "promotions.dealForm.submitCreate")}
              pendingLabel={translateMessage("common.pleaseWait")}
              isPending={isSaving}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
