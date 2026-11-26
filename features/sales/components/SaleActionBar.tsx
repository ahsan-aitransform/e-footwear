"use client";

import { Printer, RotateCcw, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { SalePrintChoices } from "../hooks/useSaleEntryWorkspace";
import { SalePrintFormatCodes, SalePrintLanguageCodes, type SalePrintFormatCode, type SalePrintLanguageCode } from "../types/saleTypes";

// The bottom bar of New Sale and Exchange (docx 5.1): Description, Add Promise, Print Gate Pass, Paper (Thermal / A4 / A5), Language (English Print /
// Urdu Print) and the buttons Save, Save & Print, Reset, Close. Save & Print is only offered to people who may print.
export function SaleActionBar({
  description,
  onDescriptionChange,
  printChoices,
  onPrintChoicesChange,
  isSaving,
  mayPrint,
  onSave,
  onSaveAndPrint,
  onReset,
  onClose,
}: {
  description: string;
  onDescriptionChange: (description: string) => void;
  printChoices: SalePrintChoices;
  onPrintChoicesChange: (changes: Partial<SalePrintChoices>) => void;
  isSaving: boolean;
  mayPrint: boolean;
  onSave: () => void;
  onSaveAndPrint: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { translateMessage } = useTranslation();

  return (
    <div className="space-y-4 print:hidden" data-testid="sale-action-bar">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="field-sale-description">{translateMessage("sales.bottom.description")}</Label>
          <Input id="field-sale-description" value={description} maxLength={500} onChange={(event) => onDescriptionChange(event.target.value)} />
          <div className="flex flex-wrap items-center gap-4 pt-1">
            {mayPrint && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sale-gate-pass"
                  checked={printChoices.includeGatePass}
                  onCheckedChange={(checked) => onPrintChoicesChange({ includeGatePass: checked === true })}
                />
                <Label htmlFor="sale-gate-pass">{translateMessage("sales.bottom.printGatePass")}</Label>
              </div>
            )}
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{translateMessage("sales.bottom.paper")}</legend>
          <RadioGroup value={printChoices.formatCode} onValueChange={(value) => onPrintChoicesChange({ formatCode: value as SalePrintFormatCode })}>
            {(
              [
                [SalePrintFormatCodes.thermal, "sales.bottom.paperThermal"],
                [SalePrintFormatCodes.a4, "sales.bottom.paperAFour"],
                [SalePrintFormatCodes.a5, "sales.bottom.paperAFive"],
              ] as const
            ).map(([code, messageKey]) => (
              <div key={code} className="flex items-center gap-2">
                <RadioGroupItem value={code} id={`sale-paper-${code}`} />
                <Label htmlFor={`sale-paper-${code}`}>{translateMessage(messageKey)}</Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{translateMessage("sales.bottom.language")}</legend>
          <RadioGroup value={printChoices.languageCode} onValueChange={(value) => onPrintChoicesChange({ languageCode: value as SalePrintLanguageCode })}>
            {(
              [
                [SalePrintLanguageCodes.english, "sales.bottom.languageEnglish"],
                [SalePrintLanguageCodes.urdu, "sales.bottom.languageUrdu"],
              ] as const
            ).map(([code, messageKey]) => (
              <div key={code} className="flex items-center gap-2">
                <RadioGroupItem value={code} id={`sale-language-${code}`} />
                <Label htmlFor={`sale-language-${code}`}>{translateMessage(messageKey)}</Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={isSaving} onClick={onSave}>
          <Save />
          {translateMessage("sales.bottom.save")}
        </Button>
        {mayPrint && (
          <Button type="button" variant="secondary" disabled={isSaving} onClick={onSaveAndPrint}>
            <Printer />
            {translateMessage("sales.bottom.saveAndPrint")}
          </Button>
        )}
        <Button type="button" variant="outline" disabled={isSaving} onClick={onReset}>
          <RotateCcw />
          {translateMessage("sales.bottom.reset")}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          <X />
          {translateMessage("sales.bottom.close")}
        </Button>
      </div>
    </div>
  );
}
