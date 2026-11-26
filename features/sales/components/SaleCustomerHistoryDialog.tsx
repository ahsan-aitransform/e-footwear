"use client";

import { useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import type { PaginatedResponse } from "@/lib/types/pagination";
import { SaleDocumentTypeCodes, type SaleCustomerPurchaseResponse } from "../types/saleTypes";

const HISTORY_PAGE_SIZE = 10;

// What the chosen customer bought before: every posted invoice with its items, newest first. Mount it only while it is open.
export function SaleCustomerHistoryDialog({ path, customerName, onClose }: { path: string; customerName: string; onClose: () => void }) {
  const { translateMessage } = useTranslation();
  const [pageNumber, setPageNumber] = useState(1);
  const history = useApiQuery<PaginatedResponse<SaleCustomerPurchaseResponse>>(path, { query: { pageNumber, pageSize: HISTORY_PAGE_SIZE } });
  const totalPages = history.data ? Math.max(1, Math.ceil(history.data.totalCount / HISTORY_PAGE_SIZE)) : 1;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{translateMessage("sales.history.title", { name: customerName })}</DialogTitle>
          <DialogDescription>{translateMessage("sales.history.description")}</DialogDescription>
        </DialogHeader>
        {history.status === "loading" && <LoadingIndicator />}
        {history.status === "error" && <InlineNotice tone={ToneNames.danger}>{history.problem?.message}</InlineNotice>}
        {history.data?.items.length === 0 && <p className="text-muted-foreground">{translateMessage("sales.history.empty")}</p>}
        {(history.data?.items ?? []).map((invoice) => (
          <section key={invoice.invoiceId} className="space-y-2 rounded-lg border p-3" data-testid="sale-history-invoice">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="font-medium">{translateMessage("sales.history.invoice", { number: invoice.invoiceNumber })}</h3>
              {invoice.documentTypeCode === SaleDocumentTypeCodes.return && <ToneBadge tone={ToneNames.warning}>{translateMessage("sales.history.return")}</ToneBadge>}
              <span className="text-muted-foreground" dir="ltr">{invoice.saleDate}</span>
              <span className="text-muted-foreground">{invoice.storeName}</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translateMessage("sales.history.item")}</TableHead>
                  <TableHead>{translateMessage("sales.history.size")}</TableHead>
                  <TableHead className="text-end">{translateMessage("sales.history.quantity")}</TableHead>
                  <TableHead className="text-end">{translateMessage("sales.history.price")}</TableHead>
                  <TableHead className="text-end">{translateMessage("sales.history.amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lines.map((line) => (
                  <TableRow key={line.lineId}>
                    <TableCell>{line.colorName ? `${line.productName} (${line.colorName})` : line.productName}</TableCell>
                    <TableCell dir="ltr">{line.sizeCode}</TableCell>
                    <TableCell className="text-end" dir="ltr">{line.quantity}</TableCell>
                    <TableCell className="text-end">{formatWholeRupees(line.unitPrice)}</TableCell>
                    <TableCell className="text-end">{formatWholeRupees(line.netAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="flex flex-wrap justify-end gap-x-4">
              <span className="font-medium">{translateMessage("sales.history.net", { amount: formatWholeRupees(invoice.netAmount) })}</span>
              <span>{translateMessage("sales.history.paid", { amount: formatWholeRupees(invoice.paidAmount) })}</span>
              <span>{translateMessage("sales.history.outstanding", { amount: formatWholeRupees(invoice.outstandingAmount) })}</span>
            </p>
          </section>
        ))}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)}>
              {translateMessage("sales.history.previousPage")}
            </Button>
            <span dir="ltr">{pageNumber} / {totalPages}</span>
            <Button type="button" variant="outline" size="sm" disabled={pageNumber >= totalPages} onClick={() => setPageNumber(pageNumber + 1)}>
              {translateMessage("sales.history.nextPage")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
