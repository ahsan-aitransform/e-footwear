"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api/apiRequest";
import type { RoundingMode } from "@/lib/constants/moneyFormat";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity, parseQuantityInput } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { calculateReturnedLineAmount } from "../logic/saleCalculations";
import { addReturnableInvoice, allReturnableLines, emptyReturnSelection, type ReturnSelection, type ReturnSelections } from "../logic/saleReturnSelections";
import { ReturnedItemConditionCodes, type ReturnableInvoiceResponse, type ReturnedItemConditionCode } from "../types/saleTypes";

// "Return from invoice": find a posted sale by its number, then say how many of each line come back, why, and in what condition. The invoice column keeps
// each returned item tied to the sale it came from, as the docx Exchange grid does. Quantities above what is still returnable are marked at once.
export function ReturnedItemsSection({
  invoiceByNumberPath,
  storeId,
  roundingMode,
  invoices,
  onInvoicesChange,
  selections,
  onSelectionsChange,
  isDisabled = false,
}: {
  invoiceByNumberPath: string;
  storeId: string;
  roundingMode: RoundingMode;
  invoices: readonly ReturnableInvoiceResponse[];
  onInvoicesChange: (invoices: ReturnableInvoiceResponse[]) => void;
  selections: ReturnSelections;
  onSelectionsChange: (selections: ReturnSelections) => void;
  isDisabled?: boolean;
}) {
  const { translateMessage } = useTranslation();
  const [invoiceNumberText, setInvoiceNumberText] = useState("");
  const [isFinding, setIsFinding] = useState(false);
  const [message, setMessage] = useState<string>();
  const lines = allReturnableLines(invoices);

  async function findInvoice() {
    const invoiceNumber = Number.parseInt(invoiceNumberText, 10);
    if (!Number.isSafeInteger(invoiceNumber) || invoiceNumber <= 0) {
      setMessage(translateMessage("sales.return.enterInvoiceNumber"));
      return;
    }
    setMessage(undefined);
    setIsFinding(true);
    const result = await apiRequest<ReturnableInvoiceResponse>(invoiceByNumberPath, { query: { storeId, invoiceNumber } });
    setIsFinding(false);
    if (!result.ok) {
      setMessage(result.problem.message);
      return;
    }
    onInvoicesChange(addReturnableInvoice(invoices, result.data));
    setInvoiceNumberText("");
  }

  function changeSelection(lineId: string, changes: Partial<ReturnSelection>) {
    onSelectionsChange({ ...selections, [lineId]: { ...(selections[lineId] ?? emptyReturnSelection), ...changes } });
  }

  return (
    <div className="space-y-3 print:hidden" data-testid="returned-items-section">
      <div className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="field-return-invoice-number">{translateMessage("sales.return.originalInvoiceNumber")}</Label>
          <Input
            id="field-return-invoice-number"
            inputMode="numeric"
            dir="ltr"
            value={invoiceNumberText}
            disabled={isDisabled}
            onChange={(event) => setInvoiceNumberText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                void findInvoice();
              }
            }}
          />
        </div>
        <Button type="button" variant="outline" disabled={isDisabled || isFinding || storeId === ""} onClick={() => void findInvoice()}>
          <Search />
          {translateMessage("sales.return.findInvoice")}
        </Button>
      </div>
      {message && <InlineNotice tone={ToneNames.danger}>{message}</InlineNotice>}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <caption className="sr-only">{translateMessage("sales.return.caption")}</caption>
          <TableHeader>
            <TableRow>
              <TableHead>{translateMessage("sales.return.invoice")}</TableHead>
              <TableHead>{translateMessage("sales.grid.code")}</TableHead>
              <TableHead>{translateMessage("sales.grid.productName")}</TableHead>
              <TableHead>{translateMessage("sales.grid.size")}</TableHead>
              <TableHead className="text-end">{translateMessage("sales.return.sold")}</TableHead>
              <TableHead className="text-end">{translateMessage("sales.return.alreadyReturned")}</TableHead>
              <TableHead className="text-end">{translateMessage("sales.return.returnable")}</TableHead>
              <TableHead className="text-end">{translateMessage("sales.return.returnQuantity")}</TableHead>
              <TableHead className="text-end">{translateMessage("sales.return.pricePaid")}</TableHead>
              <TableHead className="text-end">{translateMessage("sales.grid.total")}</TableHead>
              <TableHead>{translateMessage("sales.return.reason")}</TableHead>
              <TableHead>{translateMessage("sales.return.condition")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="py-6 text-center text-muted-foreground">
                  {translateMessage("sales.return.empty")}
                </TableCell>
              </TableRow>
            )}
            {lines.map((line) => {
              const selection = selections[line.lineId] ?? emptyReturnSelection;
              const isOverLimit = (selection.quantity ?? 0) > line.returnableQuantity;
              const quantityText = selection.quantity === null ? "" : String(selection.quantity);
              return (
                <TableRow key={line.lineId} data-over-limit={isOverLimit || undefined}>
                  <TableCell dir="ltr">{line.invoiceNumber}</TableCell>
                  <TableCell dir="ltr">{line.productCode}</TableCell>
                  <TableCell>{line.productName}</TableCell>
                  <TableCell>{line.sizeCode}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatQuantity(line.soldQuantity)}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatQuantity(line.alreadyReturnedQuantity)}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatQuantity(line.returnableQuantity)}</TableCell>
                  <TableCell className="text-end">
                    <Input
                      aria-label={translateMessage("sales.return.returnQuantityOf", { product: line.productName })}
                      aria-invalid={isOverLimit || undefined}
                      inputMode="decimal"
                      dir="ltr"
                      className="h-7 w-20 text-end tabular-nums"
                      disabled={isDisabled || line.returnableQuantity <= 0}
                      defaultValue={quantityText}
                      key={`${line.lineId}-${selection.quantity === null ? "empty" : "set"}`}
                      onChange={(event) => {
                        const text = event.target.value.trim();
                        if (text === "") return changeSelection(line.lineId, { quantity: null });
                        const parsed = parseQuantityInput(text);
                        if (parsed !== null) changeSelection(line.lineId, { quantity: parsed });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-end tabular-nums" dir="ltr">
                    {formatWholeRupees(line.unitPrice, { withSymbol: false })}
                  </TableCell>
                  <TableCell className="text-end tabular-nums" dir="ltr">
                    {formatWholeRupees(calculateReturnedLineAmount(line.unitPrice, selection.quantity ?? 0, roundingMode), { withSymbol: false })}
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={translateMessage("sales.return.reasonOf", { product: line.productName })}
                      className="h-7 min-w-32"
                      maxLength={200}
                      value={selection.reasonText}
                      disabled={isDisabled}
                      onChange={(event) => changeSelection(line.lineId, { reasonText: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      aria-label={translateMessage("sales.return.conditionOf", { product: line.productName })}
                      value={selection.itemConditionCode}
                      disabled={isDisabled}
                      onChange={(event) => changeSelection(line.lineId, { itemConditionCode: event.target.value as ReturnedItemConditionCode })}
                    >
                      <option value={ReturnedItemConditionCodes.sellable}>{translateMessage("sales.return.conditionSellable")}</option>
                      <option value={ReturnedItemConditionCodes.damaged}>{translateMessage("sales.return.conditionDamaged")}</option>
                    </NativeSelect>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
