"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect } from "@/components/forms/OptionSelect";
import { TextInputField } from "@/components/forms/TextInputField";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SizeResponse } from "@/features/masterData/types/masterListTypes";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useCanViewMargin } from "@/lib/permissions/useCanViewMargin";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatPercentage } from "@/lib/money/quantityAndPercentage";
import type { CatalogueLookups } from "../hooks/useCatalogueLookups";
import { CatalogueLimits, FREE_SIZE_GROUP_NAME } from "../logic/catalogueLimits";
import { calculateMarginPercent, calculateMarkupPercent } from "../logic/productPricingFormulas";
import {
  buildNumericSizeCodes,
  buildRowsForSizeRange,
  createRowKey,
  type ProductVariantFormRow,
  type ProductVariantRowErrors,
} from "../logic/productFormLogic";
import { ProductStatusCodes } from "../types/catalogueTypes";
import { CompactWholeRupeeInput } from "./CompactWholeRupeeInput";

// The Sizes grid of New Product (docx 4.1): one row per size (and colour) with its barcode, purchase price and sale price, the
// margin and markup they give (owner only), and the "Start size / End size" shortcut that adds a whole run of sizes at once. An empty barcode is
// filled in by the server. A person without the "change selling price" permission cannot edit the sale price of a saved size.
export function ProductSizesGrid({
  rows,
  onRowsChange,
  rowErrors,
  lookups,
  canChangeSalePriceOfSavedSizes,
}: {
  rows: ProductVariantFormRow[];
  onRowsChange: (rows: ProductVariantFormRow[]) => void;
  rowErrors: ProductVariantRowErrors;
  lookups: CatalogueLookups;
  canChangeSalePriceOfSavedSizes: boolean;
}) {
  const { translateMessage } = useTranslation();
  const canViewMargin = useCanViewMargin();
  const [rangeSizeGroupId, setRangeSizeGroupId] = useState("");
  const [rangeColorId, setRangeColorId] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangePurchasePrice, setRangePurchasePrice] = useState<number | null>(null);
  const [rangeSalePrice, setRangeSalePrice] = useState<number | null>(null);
  const [rangeMessageKey, setRangeMessageKey] = useState<"catalogue.sizes.rangeInvalid" | "catalogue.sizes.rangeAllExist" | null>(null);

  const isFreeSize = lookups.sizeGroupOptions.find((option) => option.value === rangeSizeGroupId)?.label.trim().toLowerCase() === FREE_SIZE_GROUP_NAME;
  const isListedSizeGroup = rangeSizeGroupId !== "" && !isFreeSize;
  const sizesOfGroup = useApiQuery<SizeResponse[]>(isListedSizeGroup ? ApiEndpoints.masterData.sizesOfSizeGroup(rangeSizeGroupId) : null, { enabled: isListedSizeGroup });
  const orderedSizeCodes = useMemo(
    () => [...(sizesOfGroup.data ?? [])].sort((first, second) => first.sortOrder - second.sortOrder).map((size) => size.sizeCode),
    [sizesOfGroup.data],
  );
  const colorOptions = useMemo(() => lookups.colorOptions.map((option) => ({ value: String(option.value), label: option.label })), [lookups.colorOptions]);
  const sizeGroupOptions = useMemo(() => lookups.sizeGroupOptions.map((option) => ({ value: String(option.value), label: option.label })), [lookups.sizeGroupOptions]);
  const sizeOptions = useMemo(() => orderedSizeCodes.map((code) => ({ value: code, label: code })), [orderedSizeCodes]);

  function changeRow(rowKey: string, changes: Partial<ProductVariantFormRow>) {
    onRowsChange(rows.map((row) => (row.rowKey === rowKey ? { ...row, ...changes } : row)));
  }

  function addEmptyRow() {
    const last = rows[rows.length - 1];
    onRowsChange([
      ...rows,
      { rowKey: createRowKey(), variantId: null, rowVersion: null, colorId: last?.colorId ?? "", sizeGroupId: last?.sizeGroupId ?? "", sizeCode: "", barcode: "", purchasePrice: last?.purchasePrice ?? null, salePrice: last?.salePrice ?? null, status: ProductStatusCodes.active },
    ]);
  }

  function addRange() {
    const added = buildRowsForSizeRange({ orderedSizeCodes: isFreeSize ? buildNumericSizeCodes(rangeStart, rangeEnd) : orderedSizeCodes,startSizeCode: rangeStart, endSizeCode: rangeEnd, sizeGroupId: rangeSizeGroupId, colorId: rangeColorId, purchasePrice: rangePurchasePrice, salePrice: rangeSalePrice, existingRows: rows });
    if (added === null) return setRangeMessageKey("catalogue.sizes.rangeInvalid");
    if (added.length === 0) return setRangeMessageKey("catalogue.sizes.rangeAllExist");
    setRangeMessageKey(null);
    onRowsChange([...rows, ...added]);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">{translateMessage("catalogue.sizes.rangeTitle")}</p>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <FormField label={translateMessage("catalogue.sizes.sizeGroup")} name="catalogueRangeSizeGroup">
            {(controlProps) => <OptionSelect {...controlProps} value={rangeSizeGroupId} onValueChange={(next) => { setRangeSizeGroupId(next); setRangeStart(""); setRangeEnd(""); }} options={sizeGroupOptions} emptyOptionLabel={translateMessage("catalogue.sizes.chooseGroup")} />}
          </FormField>
          <FormField label={translateMessage("catalogue.field.color")} name="catalogueRangeColor">
            {(controlProps) => <OptionSelect {...controlProps} value={rangeColorId} onValueChange={setRangeColorId} options={colorOptions} emptyOptionLabel={translateMessage("catalogue.sizes.noColor")} />}
          </FormField>
          {isFreeSize ? (
            <>
              <TextInputField label={translateMessage("catalogue.sizes.startSize")} name="catalogueRangeStart" type="number" inputMode="numeric" min={0} step={1} dir="ltr" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
              <TextInputField label={translateMessage("catalogue.sizes.endSize")} name="catalogueRangeEnd" type="number" inputMode="numeric" min={0} step={1} dir="ltr" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
            </>
          ) : (
            <>
              <FormField label={translateMessage("catalogue.sizes.startSize")} name="catalogueRangeStart">
                {(controlProps) => <OptionSelect {...controlProps} value={rangeStart} onValueChange={setRangeStart} options={sizeOptions} isDisabled={sizeOptions.length === 0} emptyOptionLabel={translateMessage("catalogue.sizes.chooseSize")} />}
              </FormField>
              <FormField label={translateMessage("catalogue.sizes.endSize")} name="catalogueRangeEnd">
                {(controlProps) => <OptionSelect {...controlProps} value={rangeEnd} onValueChange={setRangeEnd} options={sizeOptions} isDisabled={sizeOptions.length === 0} emptyOptionLabel={translateMessage("catalogue.sizes.chooseSize")} />}
              </FormField>
            </>
          )}
          <WholeRupeeAmountField label={translateMessage("catalogue.field.purchasePrice")} name="catalogueRangePurchase" value={rangePurchasePrice} onValueChange={setRangePurchasePrice} />
          <WholeRupeeAmountField label={translateMessage("catalogue.field.salePrice")} name="catalogueRangeSale" value={rangeSalePrice} onValueChange={setRangeSalePrice} />
        </div>
        {sizesOfGroup.status === "error" && (
          <div className="mt-3">
            <InlineNotice tone={ToneNames.warning}>{translateMessage("catalogue.sizes.sizesNotAvailable")}</InlineNotice>
          </div>
        )}
        {rangeMessageKey && (
          <div className="mt-3">
            <InlineNotice tone={ToneNames.warning}>{translateMessage(rangeMessageKey)}</InlineNotice>
          </div>
        )}
        <Button type="button" variant="outline" className="mt-3" disabled={rangeStart === "" || rangeEnd === ""} onClick={addRange}>
          <Plus />
          {translateMessage("catalogue.sizes.addRange")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{translateMessage("catalogue.field.color")}</TableHead>
            <TableHead>{translateMessage("catalogue.field.size")}</TableHead>
            <TableHead>{translateMessage("catalogue.field.barcode")}</TableHead>
            <TableHead className="text-end">{translateMessage("catalogue.field.purchasePrice")}</TableHead>
            <TableHead className="text-end">{translateMessage("catalogue.field.salePrice")}</TableHead>
            {canViewMargin && <TableHead className="text-end">{translateMessage("catalogue.field.marginPercent")}</TableHead>}
            {canViewMargin && <TableHead className="text-end">{translateMessage("catalogue.field.markupPercent")}</TableHead>}
            <TableHead>
              <span className="sr-only">{translateMessage("common.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={canViewMargin ? 8 : 6} className="py-6 text-center text-muted-foreground">
                {translateMessage("catalogue.sizes.empty")}
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => {
            const errorKey = rowErrors[row.rowKey];
            const isSaved = row.variantId !== null;
            const margin = row.purchasePrice !== null && row.salePrice !== null ? calculateMarginPercent(row.salePrice, row.purchasePrice) : null;
            const markup = row.purchasePrice !== null && row.salePrice !== null ? calculateMarkupPercent(row.salePrice, row.purchasePrice) : null;
            return (
              <TableRow key={row.rowKey} aria-invalid={errorKey ? true : undefined}>
                <TableCell className="min-w-36">
                  <OptionSelect value={row.colorId} onValueChange={(next) => changeRow(row.rowKey, { colorId: next })} options={colorOptions} emptyOptionLabel={translateMessage("catalogue.sizes.noColor")} aria-invalid={errorKey ? true : undefined} />
                </TableCell>
                <TableCell>
                  <Input className="w-24" autoComplete="off" aria-label={translateMessage("catalogue.field.size")} aria-invalid={errorKey ? true : undefined} value={row.sizeCode} maxLength={CatalogueLimits.sizeCodeMaximumLength} onChange={(event) => changeRow(row.rowKey, { sizeCode: event.target.value })} />
                </TableCell>
                <TableCell>
                  <Input className="w-44" dir="ltr" autoComplete="off" aria-label={translateMessage("catalogue.field.barcode")} placeholder={translateMessage("catalogue.sizes.barcodeAuto")} value={row.barcode} maxLength={CatalogueLimits.barcodeMaximumLength} onChange={(event) => changeRow(row.rowKey, { barcode: event.target.value })} />
                </TableCell>
                <TableCell className="text-end">
                  <CompactWholeRupeeInput value={row.purchasePrice} ariaLabel={translateMessage("catalogue.field.purchasePrice")} onValueChange={(next) => changeRow(row.rowKey, { purchasePrice: next })} />
                </TableCell>
                <TableCell className="text-end">
                  <CompactWholeRupeeInput value={row.salePrice} ariaLabel={translateMessage("catalogue.field.salePrice")} isDisabled={isSaved && !canChangeSalePriceOfSavedSizes} onValueChange={(next) => changeRow(row.rowKey, { salePrice: next })} />
                </TableCell>
                {canViewMargin && <TableCell className="text-end tabular-nums">{margin === null ? "" : formatPercentage(margin)}</TableCell>}
                {canViewMargin && <TableCell className="text-end tabular-nums">{markup === null ? "" : formatPercentage(markup)}</TableCell>}
                <TableCell className="text-end">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("catalogue.sizes.removeRow")} onClick={() => onRowsChange(rows.filter((candidate) => candidate.rowKey !== row.rowKey))}>
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {rows.some((row) => rowErrors[row.rowKey]) && (
        <ul className="space-y-1 text-xs font-medium text-destructive" role="alert">
          {rows.map((row, index) => (rowErrors[row.rowKey] ? <li key={row.rowKey}>{translateMessage("catalogue.sizes.rowProblem", { row: index + 1, problem: translateMessage(rowErrors[row.rowKey]) })}</li> : null))}
        </ul>
      )}
      <Button type="button" variant="outline" onClick={addEmptyRow}>
        <Plus />
        {translateMessage("catalogue.sizes.addRow")}
      </Button>
    </div>
  );
}
