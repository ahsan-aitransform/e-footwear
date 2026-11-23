"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RoundingMode } from "@/lib/constants/moneyFormat";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity, parsePercentageInput, parseQuantityInput } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees, parseWholeRupeeInput } from "@/lib/money/wholeRupeeAmount";
import { calculateEntryLine, type SaleEntryLine, type SaleEntryLinesAction } from "../logic/saleEntryLines";
import { SaleLineDiscountTypeCodes } from "../types/saleTypes";

// A number typed into a grid cell. It keeps its own text while typing and reports a number only when the text is a valid one.
function GridNumberInput({
  value,
  parseText,
  formatNumber,
  onValueChange,
  label,
  isDisabled = false,
}: {
  value: number | null;
  parseText: (text: string) => number | null;
  formatNumber: (value: number) => string;
  onValueChange: (value: number | null) => void;
  label: string;
  isDisabled?: boolean;
}) {
  const [text, setText] = useState(value === null ? "" : formatNumber(value));
  const [lastReportedValue, setLastReportedValue] = useState<number | null>(value);
  if (value !== lastReportedValue) {
    setLastReportedValue(value);
    setText(value === null ? "" : formatNumber(value));
  }
  const isInvalid = text.trim() !== "" && parseText(text) === null;
  return (
    <Input
      aria-label={label}
      aria-invalid={isInvalid || undefined}
      disabled={isDisabled}
      value={text}
      inputMode="decimal"
      dir="ltr"
      className="h-7 w-20 text-end tabular-nums"
      onChange={(event) => {
        const nextText = event.target.value;
        setText(nextText);
        if (nextText.trim() === "") {
          setLastReportedValue(null);
          onValueChange(null);
          return;
        }
        const parsed = parseText(nextText);
        if (parsed !== null) {
          setLastReportedValue(parsed);
          onValueChange(parsed);
        }
      }}
      onBlur={() => {
        const parsed = parseText(text);
        if (parsed !== null) setText(formatNumber(parsed));
      }}
    />
  );
}

const formatPlainRupees = (amount: number) => formatWholeRupees(amount, { withSymbol: false });

// The invoice grid (docx 5.1): Code, Product Name, Unit, Size, Qty, Price, Dis %, Disc/Unit, Total. Quantity is always editable; the price needs the
// permission to change the selling price and the two discount columns need the permission to give a discount (the server checks both again).
export function SaleLinesTable({
  lines,
  roundingMode,
  mayChangeSellingPrice,
  mayGiveDiscount,
  dispatchLines,
  captionMessageKey = "sales.grid.caption",
}: {
  lines: readonly SaleEntryLine[];
  roundingMode: RoundingMode;
  mayChangeSellingPrice: boolean;
  mayGiveDiscount: boolean;
  dispatchLines: (action: SaleEntryLinesAction) => void;
  captionMessageKey?: "sales.grid.caption" | "sales.exchange.newItemsCaption";
}) {
  const { translateMessage } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-lg border print:hidden" data-testid="sale-lines-table">
      <Table>
        <caption className="sr-only">{translateMessage(captionMessageKey)}</caption>
        <TableHeader>
          <TableRow>
            <TableHead>{translateMessage("sales.grid.code")}</TableHead>
            <TableHead>{translateMessage("sales.grid.productName")}</TableHead>
            <TableHead>{translateMessage("sales.grid.unit")}</TableHead>
            <TableHead>{translateMessage("sales.grid.size")}</TableHead>
            <TableHead className="text-end">{translateMessage("sales.grid.quantity")}</TableHead>
            <TableHead className="text-end">{translateMessage("sales.grid.price")}</TableHead>
            <TableHead className="text-end">{translateMessage("sales.grid.discountPercent")}</TableHead>
            <TableHead className="text-end">{translateMessage("sales.grid.discountPerUnit")}</TableHead>
            <TableHead className="text-end">{translateMessage("sales.grid.total")}</TableHead>
            <TableHead>
              <span className="sr-only">{translateMessage("sales.grid.remove")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                {translateMessage("sales.grid.empty")}
              </TableCell>
            </TableRow>
          )}
          {lines.map((line) => {
            const amounts = calculateEntryLine(line, roundingMode);
            return (
              <TableRow key={line.lineKey}>
                <TableCell dir="ltr">{line.item.productCode}</TableCell>
                <TableCell>{line.item.productName}</TableCell>
                <TableCell>{line.item.unitName ?? ""}</TableCell>
                <TableCell>{line.item.sizeCode}</TableCell>
                <TableCell className="text-end">
                  <GridNumberInput
                    label={translateMessage("sales.grid.quantity")}
                    value={line.quantity}
                    parseText={parseQuantityInput}
                    formatNumber={formatQuantity}
                    onValueChange={(quantity) => dispatchLines({ type: "quantityChanged", lineKey: line.lineKey, quantity: quantity ?? 0 })}
                  />
                </TableCell>
                <TableCell className="text-end">
                  <GridNumberInput
                    label={translateMessage("sales.grid.price")}
                    value={line.unitPrice}
                    parseText={parseWholeRupeeInput}
                    formatNumber={formatPlainRupees}
                    isDisabled={!mayChangeSellingPrice}
                    onValueChange={(unitPrice) => dispatchLines({ type: "unitPriceChanged", lineKey: line.lineKey, unitPrice: unitPrice ?? 0 })}
                  />
                </TableCell>
                <TableCell className="text-end">
                  <GridNumberInput
                    label={translateMessage("sales.grid.discountPercent")}
                    value={line.discountTypeCode === SaleLineDiscountTypeCodes.percent ? line.discountValue : null}
                    parseText={parsePercentageInput}
                    formatNumber={formatQuantity}
                    isDisabled={!mayGiveDiscount}
                    onValueChange={(discountValue) =>
                      dispatchLines({
                        type: "discountChanged",
                        lineKey: line.lineKey,
                        discountTypeCode: discountValue === null ? SaleLineDiscountTypeCodes.none : SaleLineDiscountTypeCodes.percent,
                        discountValue,
                      })
                    }
                  />
                </TableCell>
                <TableCell className="text-end">
                  <GridNumberInput
                    label={translateMessage("sales.grid.discountPerUnit")}
                    value={amounts.discountPerUnit > 0 ? amounts.discountPerUnit : null}
                    parseText={parseWholeRupeeInput}
                    formatNumber={formatPlainRupees}
                    isDisabled={!mayGiveDiscount}
                    onValueChange={(discountValue) =>
                      dispatchLines({
                        type: "discountChanged",
                        lineKey: line.lineKey,
                        discountTypeCode: discountValue === null ? SaleLineDiscountTypeCodes.none : SaleLineDiscountTypeCodes.amount,
                        discountValue,
                      })
                    }
                  />
                </TableCell>
                <TableCell className="text-end tabular-nums" dir="ltr">
                  {formatPlainRupees(amounts.netAmount)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={translateMessage("sales.grid.removeLine", { product: line.item.productName })}
                    onClick={() => dispatchLines({ type: "lineRemoved", lineKey: line.lineKey })}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
