"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees, parseWholeRupeeInput } from "@/lib/money/wholeRupeeAmount";
import { parsePercentageInput } from "@/lib/money/quantityAndPercentage";
import {
  dealTotalAmount,
  dealTotalQuantity,
  discountAmountFromNetPrice,
  discountPercentFromNetPrice,
  netPriceFromDiscountPercent,
  type DealFormLine,
} from "../logic/promotionFormValidation";

const money = (amount: number) => formatWholeRupees(amount, { withSymbol: false });

// The grid of a deal (docx 2.12): Product, Size, Qty, Sale Price, Disc. %, Discount, Net Price, Amount. The discount percentage, the discount amount and the net price follow
// each other (the net price is what is stored). A cell keeps what the person types and applies it when they leave it or press Enter, so typing a percentage is never
// rewritten under their fingers. The deal price under the grid is the sum of quantity times net price.
export function DealLinesGrid({
  lines,
  onLinesChange,
  lineMessages,
}: {
  lines: DealFormLine[];
  onLinesChange: (lines: DealFormLine[]) => void;
  lineMessages?: Record<string, string>;
}) {
  const { translateMessage } = useTranslation();

  function changeLine(variantId: string, changes: Partial<DealFormLine>) {
    onLinesChange(lines.map((line) => (line.variantId === variantId ? { ...line, ...changes } : line)));
  }

  if (lines.length === 0) return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{translateMessage("promotions.dealForm.noLines")}</p>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table aria-label={translateMessage("promotions.dealForm.createTitle")}>
        <TableHeader>
          <TableRow>
            <TableHead>{translateMessage("promotions.dealForm.column.product")}</TableHead>
            <TableHead>{translateMessage("promotions.dealForm.column.size")}</TableHead>
            <TableHead className="text-end">{translateMessage("promotions.dealForm.column.quantity")}</TableHead>
            <TableHead className="text-end">{translateMessage("promotions.dealForm.column.salePrice")}</TableHead>
            <TableHead className="text-end">{translateMessage("promotions.dealForm.column.percent")}</TableHead>
            <TableHead className="text-end">{translateMessage("promotions.dealForm.column.discount")}</TableHead>
            <TableHead className="text-end">{translateMessage("promotions.dealForm.column.netPrice")}</TableHead>
            <TableHead className="text-end">{translateMessage("promotions.dealForm.column.amount")}</TableHead>
            <TableHead className="w-10"><span className="sr-only">{translateMessage("promotions.dealForm.column.actions")}</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => {
            const net = line.netUnitPrice ?? 0;
            const errorMessage = lineMessages?.[line.variantId];
            return (
              <TableRow key={line.variantId} aria-invalid={errorMessage ? true : undefined}>
                <TableCell>
                  {line.productName}
                  {errorMessage && <p role="alert" className="text-xs text-destructive">{errorMessage}</p>}
                </TableCell>
                <TableCell dir="ltr">{line.sizeCode}</TableCell>
                <TableCell className="text-end">
                  <DraftNumberCell
                    label={`${line.barcode} ${translateMessage("promotions.dealForm.column.quantity")}`}
                    value={line.quantity === null ? "" : String(line.quantity)}
                    onCommit={(text) => changeLine(line.variantId, { quantity: parseWholeRupeeInput(text) })}
                  />
                </TableCell>
                <TableCell className="text-end" dir="ltr">{money(line.salePrice)}</TableCell>
                <TableCell className="text-end">
                  <DraftNumberCell
                    label={`${line.barcode} ${translateMessage("promotions.dealForm.column.percent")}`}
                    value={String(discountPercentFromNetPrice(line.salePrice, net))}
                    onCommit={(text) => {
                      const percentage = parsePercentageInput(text);
                      if (percentage !== null) changeLine(line.variantId, { netUnitPrice: netPriceFromDiscountPercent(line.salePrice, percentage) });
                    }}
                  />
                </TableCell>
                <TableCell className="text-end">
                  <DraftNumberCell
                    label={`${line.barcode} ${translateMessage("promotions.dealForm.column.discount")}`}
                    value={String(discountAmountFromNetPrice(line.salePrice, net))}
                    onCommit={(text) => {
                      const discount = parseWholeRupeeInput(text);
                      if (discount !== null) changeLine(line.variantId, { netUnitPrice: Math.max(line.salePrice - discount, 0) });
                    }}
                  />
                </TableCell>
                <TableCell className="text-end">
                  <DraftNumberCell
                    label={`${line.barcode} ${translateMessage("promotions.dealForm.column.netPrice")}`}
                    value={line.netUnitPrice === null ? "" : String(line.netUnitPrice)}
                    onCommit={(text) => changeLine(line.variantId, { netUnitPrice: parseWholeRupeeInput(text) })}
                  />
                </TableCell>
                <TableCell className="text-end" dir="ltr">{money((line.quantity ?? 0) * net)}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={translateMessage("promotions.dealForm.removeLine", { name: `${line.productName} ${line.sizeCode}` })}
                    onClick={() => onLinesChange(lines.filter((candidate) => candidate.variantId !== line.variantId))}
                  >
                    <X />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>{translateMessage("promotions.dealForm.totalQuantity")}</TableCell>
            <TableCell className="text-end" dir="ltr" data-testid="deal-total-quantity">{dealTotalQuantity(lines)}</TableCell>
            <TableCell colSpan={4}>{translateMessage("promotions.dealForm.totalAmount")}</TableCell>
            <TableCell className="text-end" dir="ltr" data-testid="deal-total-amount">{money(dealTotalAmount(lines))}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

// A number the person types: the text is theirs until they leave the cell (or press Enter), then it is applied; the cell shows the value again from the parent. Remounting with
// a new key when the parent value changes is what shows the recomputed number after another cell changed it.
function DraftNumberCell({ label, value, onCommit }: { label: string; value: string; onCommit: (text: string) => void }) {
  const [text, setText] = useState(value);
  const [committedFrom, setCommittedFrom] = useState(value);
  // The parent value changed from outside (another cell): show it, unless the person is in the middle of typing a different number.
  if (committedFrom !== value) {
    setCommittedFrom(value);
    setText(value);
  }
  return (
    <Input
      value={text}
      aria-label={label}
      inputMode="decimal"
      dir="ltr"
      className="h-8 w-24 text-end"
      onChange={(event) => setText(event.target.value)}
      onBlur={() => { if (text !== value) onCommit(text); }}
      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (text !== value) onCommit(text); } }}
    />
  );
}
