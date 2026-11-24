"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { TextInputField } from "@/components/forms/TextInputField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api/apiRequest";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { parseQuantityInput, formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees, parseWholeRupeeInput } from "@/lib/money/wholeRupeeAmount";
import { showToast } from "@/lib/toast/toastStore";
import { todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import {
  AdjustmentDirections,
  MAXIMUM_ADJUSTMENT_LINES,
  addItemToLines,
  findAdjustmentProblems,
  lineTotalAmount,
  summariseAdjustment,
  toAdjustmentLineRequests,
  type AdjustmentDirection,
  type AdjustmentEntryLine,
  type AdjustmentProblem,
} from "../logic/stockAdjustmentLines";
import type { CreateStockAdjustmentRequest, StockAdjustmentResponse } from "../types/inventoryTypes";
import { InventoryItemPicker } from "./InventoryItemPicker";

// Stock Adjustment entry (docx 5.7): scan or search an item, choose Add or Remove, type the quantity (and the purchase price if it is not the one on file), then
// save. The transaction id is made once per document and kept until it is saved, so pressing Save twice (or a retry after a lost answer) posts one document.
export function StockAdjustmentEntryPanel({ storeId, onPosted }: { storeId: string; onPosted: (adjustment: StockAdjustmentResponse) => void }) {
  const { translateMessage } = useTranslation();
  const transactionIdReference = useRef(createClientTransactionId());
  const [direction, setDirection] = useState<AdjustmentDirection>(AdjustmentDirections.add);
  const [lines, setLines] = useState<AdjustmentEntryLine[]>([]);
  const [adjustmentDate, setAdjustmentDate] = useState(todayAsIsoDate());
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const summary = useMemo(() => summariseAdjustment(lines), [lines]);

  function updateLine(variantId: string, change: Partial<AdjustmentEntryLine>) {
    setLines((current) => current.map((line) => (line.variantId === variantId ? { ...line, ...change } : line)));
  }

  function describeProblem(problem: AdjustmentProblem): string {
    const parameters = { line: problem.lineNumber, maximum: MAXIMUM_ADJUSTMENT_LINES };
    switch (problem.kind) {
      case "quantityMissing":
        return translateMessage("inventory.adjustment.problem.quantityMissing", parameters);
      case "quantityTooLarge":
        return translateMessage("inventory.adjustment.problem.quantityTooLarge", parameters);
      case "moreThanInStock":
        return translateMessage("inventory.adjustment.problem.moreThanInStock", parameters);
      case "tooManyLines":
        return translateMessage("inventory.adjustment.problem.tooManyLines", parameters);
    }
  }

  function reset() {
    setLines([]);
    setDescription("");
    setErrorMessage(undefined);
    transactionIdReference.current = createClientTransactionId();
  }

  async function handleSave() {
    setErrorMessage(undefined);
    if (lines.length === 0) return setErrorMessage(translateMessage("inventory.adjustment.problem.noLines"));
    if (!isValidIsoDate(adjustmentDate)) return setErrorMessage(translateMessage("fields.invalidDate"));
    const problems = findAdjustmentProblems(lines);
    if (problems.length > 0) return setErrorMessage(describeProblem(problems[0]));

    setIsSaving(true);
    const request: CreateStockAdjustmentRequest = {
      storeId,
      adjustmentDate,
      clientTransactionId: transactionIdReference.current,
      description: description.trim() === "" ? null : description.trim(),
      lines: toAdjustmentLineRequests(lines),
    };
    const result = await apiRequest<StockAdjustmentResponse>(ApiEndpoints.inventory.stockAdjustments.list, {
      method: "POST",
      body: request,
      idempotencyKey: transactionIdReference.current,
    });
    setIsSaving(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    showToast(translateMessage("inventory.adjustment.saved", { number: result.data.documentNumber }), "success");
    onPosted(result.data);
    reset();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <DateField label={translateMessage("inventory.common.date")} name="adjustmentDate" value={adjustmentDate} onValueChange={setAdjustmentDate} maximumIsoDate={todayAsIsoDate()} isRequired />
        <div className="sm:col-span-2">
          <TextInputField
            label={translateMessage("inventory.common.description")}
            name="adjustmentDescription"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
          />
        </div>
      </div>

      <InventoryItemPicker
        storeId={storeId}
        barcodePath={ApiEndpoints.inventory.stockAdjustments.itemByBarcode}
        searchPath={ApiEndpoints.inventory.stockAdjustments.itemSearch}
        onItemChosen={(item) => setLines((current) => addItemToLines(current, item, direction))}
        isDisabled={isSaving}
      />
      <RadioGroup value={direction} onValueChange={(value) => setDirection(value as AdjustmentDirection)} className="flex gap-6" aria-label={translateMessage("inventory.adjustment.direction")}>
        <div className="flex items-center gap-2">
          <RadioGroupItem value={AdjustmentDirections.add} id="adjustment-direction-add" />
          <Label htmlFor="adjustment-direction-add">{translateMessage("inventory.adjustment.add")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value={AdjustmentDirections.remove} id="adjustment-direction-remove" />
          <Label htmlFor="adjustment-direction-remove">{translateMessage("inventory.adjustment.remove")}</Label>
        </div>
      </RadioGroup>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{translateMessage("inventory.column.barcode")}</TableHead>
            <TableHead>{translateMessage("inventory.column.product")}</TableHead>
            <TableHead>{translateMessage("inventory.column.size")}</TableHead>
            <TableHead className="text-end">{translateMessage("inventory.column.inStock")}</TableHead>
            <TableHead>{translateMessage("inventory.adjustment.direction")}</TableHead>
            <TableHead className="w-28 text-end">{translateMessage("inventory.column.quantity")}</TableHead>
            <TableHead className="w-32 text-end">{translateMessage("inventory.column.unitCost")}</TableHead>
            <TableHead className="text-end">{translateMessage("inventory.column.total")}</TableHead>
            <TableHead className="w-10"><span className="sr-only">{translateMessage("inventory.common.remove")}</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                {translateMessage("inventory.adjustment.empty")}
              </TableCell>
            </TableRow>
          )}
          {lines.map((line) => (
            <TableRow key={line.variantId}>
              <TableCell dir="ltr" className="text-start">{line.barcode}</TableCell>
              <TableCell>{line.productName}</TableCell>
              <TableCell>{line.sizeCode}</TableCell>
              <TableCell className="text-end tabular-nums">{formatQuantity(line.stockQuantity)}</TableCell>
              <TableCell>
                <NativeSelect
                  aria-label={translateMessage("inventory.adjustment.direction")}
                  value={line.direction}
                  onChange={(event) => updateLine(line.variantId, { direction: event.target.value as AdjustmentDirection })}
                >
                  <option value={AdjustmentDirections.add}>{translateMessage("inventory.adjustment.add")}</option>
                  <option value={AdjustmentDirections.remove}>{translateMessage("inventory.adjustment.remove")}</option>
                </NativeSelect>
              </TableCell>
              <TableCell>
                <Input
                  aria-label={translateMessage("inventory.column.quantity")}
                  inputMode="decimal"
                  dir="ltr"
                  className="text-end"
                  value={line.quantityText}
                  onChange={(event) => updateLine(line.variantId, { quantityText: event.target.value, quantity: parseQuantityInput(event.target.value) })}
                />
              </TableCell>
              <TableCell>
                <Input
                  aria-label={translateMessage("inventory.column.unitCost")}
                  inputMode="numeric"
                  dir="ltr"
                  className="text-end"
                  defaultValue={String(line.unitCostAmount)}
                  onChange={(event) => {
                    const amount = parseWholeRupeeInput(event.target.value);
                    if (amount !== null && amount >= 0) updateLine(line.variantId, { unitCostAmount: amount });
                  }}
                />
              </TableCell>
              <TableCell className="text-end tabular-nums">{formatWholeRupees(lineTotalAmount(line))}</TableCell>
              <TableCell>
                <Button type="button" variant="ghost" size="icon" aria-label={translateMessage("inventory.common.remove")} onClick={() => setLines((current) => current.filter((candidate) => candidate.variantId !== line.variantId))}>
                  <Trash2 />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {lines.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5}>{translateMessage("inventory.column.totals")}</TableCell>
              <TableCell className="text-end tabular-nums">
                +{formatQuantity(summary.addedQuantity)} / −{formatQuantity(summary.removedQuantity)}
              </TableCell>
              <TableCell />
              <TableCell className="text-end tabular-nums">{formatWholeRupees(summary.netValueAmount)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>

      <FormResultNotice errorMessage={errorMessage} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleSave} disabled={isSaving || lines.length === 0}>
          {translateMessage("inventory.common.save")}
        </Button>
        <Button type="button" variant="outline" onClick={reset} disabled={isSaving}>
          {translateMessage("inventory.common.reset")}
        </Button>
      </div>
    </div>
  );
}
