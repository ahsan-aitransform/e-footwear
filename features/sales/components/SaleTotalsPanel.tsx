"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import type { SaleTotals } from "../logic/saleCalculations";

// The totals box of New Sale (docx 5.1): Total Quantity, Total Items, Gross Bill, Discount and the large Net Bill.
export function SaleTotalsPanel({ totals, heading }: { totals: SaleTotals; heading?: string }) {
  const { translateMessage } = useTranslation();
  return (
    <dl className="space-y-1.5 rounded-lg border p-3 print:hidden" data-testid="sale-totals-panel" aria-label={heading ?? translateMessage("sales.totals.heading")}>
      <div className="flex justify-between text-sm">
        <dt className="text-muted-foreground">{translateMessage("sales.totals.totalQuantity")}</dt>
        <dd className="tabular-nums" dir="ltr">
          {formatQuantity(totals.totalQuantity)}
        </dd>
      </div>
      <div className="flex justify-between text-sm">
        <dt className="text-muted-foreground">{translateMessage("sales.totals.totalItems")}</dt>
        <dd className="tabular-nums" dir="ltr">
          {totals.lineCount}
        </dd>
      </div>
      <div className="flex justify-between text-sm">
        <dt className="text-muted-foreground">{translateMessage("sales.totals.grossBill")}</dt>
        <dd className="tabular-nums" dir="ltr">
          {formatWholeRupees(totals.grossAmount)}
        </dd>
      </div>
      <div className="flex justify-between text-sm">
        <dt className="text-muted-foreground">{translateMessage("sales.totals.discount")}</dt>
        <dd className="tabular-nums" dir="ltr">
          {formatWholeRupees(totals.discountAmount)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between border-t pt-2">
        <dt className="font-medium">{translateMessage("sales.totals.netBill")}</dt>
        <dd className="text-2xl font-semibold tabular-nums" dir="ltr" data-testid="sale-net-bill">
          {formatWholeRupees(totals.netAmount)}
        </dd>
      </div>
    </dl>
  );
}
