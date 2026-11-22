"use client";

import { InlineNotice } from "@/components/feedback/InlineNotice";
import { SectionCard } from "@/components/layout/SectionCard";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { formatColumnAmount } from "../logic/balanceFormatting";
import { paymentModeMessageKeys, voucherTypeTitleMessageKeys } from "../logic/voucherTypeDefinitions";
import { VoucherStatusCodes, type VoucherResponse } from "../types/voucherTypes";

// A saved voucher as it is printed and as View Voucher shows it: the header facts, the two journal lines (Code, Title, Debit, Credit,
// Description, with their totals), the invoices it settles, and a banner when it was voided. Everything shown comes from the server.
export function VoucherDetailCard({ voucher }: { voucher: VoucherResponse }) {
  const { translateMessage } = useTranslation();
  const totalDebit = voucher.lines.reduce((sum, line) => sum + line.debitAmount, 0);
  const totalCredit = voucher.lines.reduce((sum, line) => sum + line.creditAmount, 0);
  const title = translateMessage("accounting.view.detail.title", {
    type: translateMessage(voucherTypeTitleMessageKeys[voucher.voucherTypeCode]),
    number: voucher.voucherNumber,
  });

  return (
    <SectionCard title={title} description={`${voucher.storeName} · ${voucher.voucherDate}`}>
      <div className="space-y-4">
        {voucher.statusCode === VoucherStatusCodes.void && (
          <InlineNotice tone={ToneNames.warning}>
            {translateMessage("accounting.view.void.banner", { date: voucher.voidedAt?.slice(0, 10) ?? "", reason: voucher.voidReason ?? "" })}
          </InlineNotice>
        )}
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <DetailRow label={translateMessage("accounting.view.detail.amount")} value={formatWholeRupees(voucher.amount)} />
          <DetailRow
            label={translateMessage("accounting.view.detail.status")}
            value={translateMessage(voucher.statusCode === VoucherStatusCodes.void ? "accounting.common.statusVoid" : "accounting.common.statusPosted")}
          />
          {voucher.partyName && <DetailRow label={translateMessage("accounting.view.detail.party")} value={voucher.partyName} />}
          {voucher.referenceNumber && <DetailRow label={translateMessage("accounting.view.detail.reference")} value={voucher.referenceNumber} />}
          {voucher.paymentMode && (
            <DetailRow label={translateMessage("accounting.view.detail.paymentMode")} value={translateMessage(paymentModeMessageKeys[voucher.paymentMode])} />
          )}
        </dl>

        <div>
          <h3 className="mb-2 text-sm font-semibold">{translateMessage("accounting.view.lines.title")}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translateMessage("accounting.view.column.code")}</TableHead>
                <TableHead>{translateMessage("accounting.view.column.title")}</TableHead>
                <TableHead className="text-end">{translateMessage("accounting.view.column.debit")}</TableHead>
                <TableHead className="text-end">{translateMessage("accounting.view.column.credit")}</TableHead>
                <TableHead>{translateMessage("accounting.view.column.description")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voucher.lines.map((line, index) => (
                <TableRow key={`${line.accountCode}-${index}`}>
                  <TableCell dir="ltr">{line.accountCode}</TableCell>
                  <TableCell>{line.partyName ? `${line.partyName} (${line.accountTitle})` : line.accountTitle}</TableCell>
                  <TableCell className="text-end">{formatColumnAmount(line.debitAmount)}</TableCell>
                  <TableCell className="text-end">{formatColumnAmount(line.creditAmount)}</TableCell>
                  <TableCell>{line.description ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>{translateMessage("accounting.common.totals")}</TableCell>
                <TableCell className="text-end" data-testid="voucher-total-debit">{formatWholeRupees(totalDebit)}</TableCell>
                <TableCell className="text-end" data-testid="voucher-total-credit">{formatWholeRupees(totalCredit)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {voucher.allocations.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">{translateMessage("accounting.view.settled.title")}</h3>
            <ul className="space-y-1 text-sm">
              {voucher.allocations.map((allocation) => (
                <li key={allocation.invoiceId}>
                  {translateMessage(allocation.invoiceKindCode === "PURCHASE" ? "accounting.view.settled.purchase" : "accounting.view.settled.sale", {
                    number: allocation.invoiceNumber,
                  })}
                  : {formatWholeRupees(allocation.amount)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
