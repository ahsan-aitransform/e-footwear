"use client";

import type { ReactNode } from "react";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { SectionCard } from "@/components/layout/SectionCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { SaleDocumentTypeCodes, SaleInvoiceStatusCodes, type SaleInvoiceResponse } from "../types/saleTypes";

function Fact({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

// One stored invoice: who, when, the lines, the payments, how it ended up (void reason, the return or exchange partner, the invoice it replaces).
// On a return the quantities and amounts are negative, exactly as stored.
export function SaleInvoiceDetailCard({ invoice, actions }: { invoice: SaleInvoiceResponse; actions?: ReactNode }) {
  const { translateMessage } = useTranslation();
  const isVoid = invoice.statusCode === SaleInvoiceStatusCodes.void;
  const isReturn = invoice.documentTypeCode === SaleDocumentTypeCodes.return;
  return (
    <SectionCard
      title={translateMessage("sales.detail.title", { number: invoice.invoiceNumber })}
      description={translateMessage(isReturn ? "sales.detail.typeReturn" : "sales.detail.typeSale")}
      action={actions}
    >
      <div className="space-y-4" data-testid="sale-invoice-detail">
        <div className="flex flex-wrap gap-2">
          <ToneBadge tone={isVoid ? ToneNames.danger : ToneNames.success}>{translateMessage(isVoid ? "sales.status.VOID" : "sales.status.POSTED")}</ToneBadge>
          {invoice.relatedInvoiceNumber !== null && <ToneBadge tone={ToneNames.info}>{translateMessage("sales.detail.partOfExchange", { number: invoice.relatedInvoiceNumber })}</ToneBadge>}
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label={translateMessage("sales.header.date")} value={invoice.saleDate} />
          <Fact label={translateMessage("sales.detail.store")} value={invoice.storeName} />
          <Fact label={translateMessage("sales.header.dailyBillNumber")} value={invoice.dailyBillNumber} />
          <Fact label={translateMessage("sales.header.customer")} value={invoice.customerName ?? invoice.walkInCustomerName} />
          <Fact label={translateMessage("sales.header.walkInMobile")} value={invoice.walkInCustomerMobile} />
          <Fact label={translateMessage("sales.header.salesman")} value={invoice.salesmanName} />
          <Fact label={translateMessage("sales.header.posTerminal")} value={invoice.posTerminalLabel} />
          <Fact label={translateMessage("sales.detail.createdBy")} value={invoice.createdByName} />
          <Fact label={translateMessage("sales.detail.originalInvoice")} value={invoice.originalInvoiceNumber} />
          <Fact label={translateMessage("sales.detail.replacesInvoice")} value={invoice.replacesInvoiceNumber} />
          <Fact label={translateMessage("sales.bottom.description")} value={invoice.description} />
        </dl>

        {isVoid && (
          <dl className="grid gap-3 rounded-lg border border-destructive/30 p-3 sm:grid-cols-3" data-testid="sale-void-facts">
            <Fact label={translateMessage("sales.detail.voidReason")} value={invoice.voidReason} />
            <Fact label={translateMessage("sales.detail.voidedBy")} value={invoice.voidedByName} />
            <Fact label={translateMessage("sales.detail.voidedAt")} value={invoice.voidedAt ? invoice.voidedAt.slice(0, 16).replace("T", " ") : null} />
          </dl>
        )}

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <caption className="sr-only">{translateMessage("sales.detail.linesCaption")}</caption>
            <TableHeader>
              <TableRow>
                <TableHead>{translateMessage("sales.grid.code")}</TableHead>
                <TableHead>{translateMessage("sales.grid.productName")}</TableHead>
                <TableHead>{translateMessage("sales.grid.size")}</TableHead>
                <TableHead className="text-end">{translateMessage("sales.grid.quantity")}</TableHead>
                <TableHead className="text-end">{translateMessage("sales.grid.price")}</TableHead>
                <TableHead className="text-end">{translateMessage("sales.grid.discountPerUnit")}</TableHead>
                <TableHead className="text-end">{translateMessage("sales.grid.total")}</TableHead>
                {isReturn && <TableHead>{translateMessage("sales.return.reason")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines.map((line) => (
                <TableRow key={line.lineId}>
                  <TableCell dir="ltr">{line.productCode}</TableCell>
                  <TableCell>{line.productName}</TableCell>
                  <TableCell>{line.sizeCode}</TableCell>
                  <TableCell className="text-end tabular-nums" dir="ltr">
                    {formatQuantity(line.quantity)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums" dir="ltr">
                    {formatWholeRupees(line.listPrice, { withSymbol: false })}
                  </TableCell>
                  <TableCell className="text-end tabular-nums" dir="ltr">
                    {formatWholeRupees(line.discountPerUnit, { withSymbol: false })}
                  </TableCell>
                  <TableCell className="text-end tabular-nums" dir="ltr">
                    {formatWholeRupees(line.netAmount, { withSymbol: false })}
                  </TableCell>
                  {isReturn && <TableCell>{line.returnReason ?? ""}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm font-medium">{translateMessage("sales.payment.heading")}</h3>
            {invoice.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{translateMessage("sales.detail.noPayments")}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {invoice.payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between gap-3">
                    <span>
                      {payment.paymentAccountTitle}
                      {payment.referenceNumber ? ` · ${payment.referenceNumber}` : ""}
                    </span>
                    <span className="tabular-nums" dir="ltr">
                      {formatWholeRupees(payment.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{translateMessage("sales.totals.grossBill")}</dt>
              <dd className="tabular-nums" dir="ltr">
                {formatWholeRupees(invoice.grossAmount)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{translateMessage("sales.totals.discount")}</dt>
              <dd className="tabular-nums" dir="ltr">
                {formatWholeRupees(invoice.discountAmount)}
              </dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>{translateMessage("sales.totals.netBill")}</dt>
              <dd className="tabular-nums" dir="ltr">
                {formatWholeRupees(invoice.netAmount)}
              </dd>
            </div>
            {!isReturn && (
              <>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{translateMessage("sales.payment.paidAmount")}</dt>
                  <dd className="tabular-nums" dir="ltr">
                    {formatWholeRupees(invoice.paidAmount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{translateMessage("sales.payment.cashReturn")}</dt>
                  <dd className="tabular-nums" dir="ltr">
                    {formatWholeRupees(invoice.cashReturnedAmount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{translateMessage("sales.payment.balance")}</dt>
                  <dd className="tabular-nums" dir="ltr">
                    {formatWholeRupees(invoice.outstandingAmount)}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>
    </SectionCard>
  );
}
