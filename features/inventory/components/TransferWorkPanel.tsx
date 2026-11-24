"use client";

import { Printer } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { bearerMessageKey } from "../logic/inventoryStatusPresentation";
import {
  StockTransferStatusCodes,
  type StockTransferLineResponse,
  type StockTransferResponse,
  type TransferLossCaseResponse,
  type TransferScanResultResponse,
} from "../types/inventoryTypes";
import { BarcodeScanBox } from "./BarcodeScanBox";
import { InventoryStatusBadge } from "./InventoryStatusBadge";

const MAXIMUM_PIECES_PER_TRANSFER_SCAN = 200;

export const TransferWorkModes = { send: "send", receive: "receive" } as const;
export type TransferWorkMode = (typeof TransferWorkModes)[keyof typeof TransferWorkModes];

// One transfer being worked on. In "send" mode the sending store scans the pieces into the draft and dispatches it (they leave its stock and are in transit); in "receive"
// mode the receiving store scans what arrives and completes the receiving: scanned pieces go into its stock, pieces not scanned are raised as missing and wait for a decision on
// the Transfer Discrepancies screen. Nothing is assumed about missing pieces.
export function TransferWorkPanel({ transferId, mode, onChanged, onClosed }: { transferId: string; mode: TransferWorkMode; onChanged: () => void; onClosed: () => void }) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const isSending = mode === TransferWorkModes.send;
  const endpoints = isSending ? ApiEndpoints.inventory.stockTransfers : ApiEndpoints.inventory.stockTransferReceiving;
  const transfer = useApiQuery<StockTransferResponse>(endpoints.byId(transferId));
  const current = transfer.data;
  const failedScanReference = useRef<{ key: string; scanBatchId: string }>(undefined);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [confirm, setConfirm] = useState<"dispatch" | "cancel" | "complete">();

  const maySend = hasPermission(PermissionCodes.INVOICE.STOCK_TRANSFER.EDIT) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.TRANSFER_CREATE);
  const mayCancel = hasPermission(PermissionCodes.INVOICE.STOCK_TRANSFER.DELETE) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.TRANSFER_CREATE);
  const mayReceive = hasPermission(PermissionCodes.INVENTORY.STOCK_TRANSFER_RECEIVING.EDIT) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.TRANSFER_RECEIVE);
  const mayComplete = hasPermission(PermissionCodes.INVENTORY.STOCK_TRANSFER_RECEIVING.ADD) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.TRANSFER_RECEIVE);
  const mayPrint = hasPermission(isSending ? PermissionCodes.INVOICE.STOCK_TRANSFER.PRINT : PermissionCodes.INVENTORY.STOCK_TRANSFER_RECEIVING.PRINT);

  const isDraft = current?.statusCode === StockTransferStatusCodes.draft;
  const isReceivable = current?.statusCode === StockTransferStatusCodes.shipped || current?.statusCode === StockTransferStatusCodes.receiving;
  const canScan = isSending ? isDraft && maySend : isReceivable && mayReceive;

  const lineColumns = useMemo<DataGridColumn<StockTransferLineResponse>[]>(() => {
    const columns: DataGridColumn<StockTransferLineResponse>[] = [
      { key: "barcode", header: translateMessage("inventory.column.barcode"), render: (line) => <span dir="ltr">{line.barcode}</span> },
      { key: "product", header: translateMessage("inventory.column.product"), render: (line) => line.productName },
      { key: "size", header: translateMessage("inventory.column.size"), render: (line) => line.sizeCode },
    ];
    if (isSending) {
      columns.push({ key: "scanned", header: translateMessage("inventory.transfer.column.scanned"), alignment: "end", render: (line) => formatQuantity(line.quantityScanned) });
    }
    columns.push(
      { key: "shipped", header: translateMessage("inventory.transfer.column.shipped"), alignment: "end", render: (line) => formatQuantity(line.quantityShipped) },
      { key: "received", header: translateMessage("inventory.transfer.column.received"), alignment: "end", render: (line) => formatQuantity(line.quantityReceived) },
      {
        key: "missing",
        header: translateMessage("inventory.transfer.column.missing"),
        alignment: "end",
        // While receiving is open the "missing" of the database is still zero: the pieces not yet scanned are shown as "to receive".
        render: (line) => formatQuantity(isReceivable ? Math.max(line.quantityShipped - line.quantityReceived, 0) : line.quantityMissing),
      },
      { key: "value", header: translateMessage("inventory.column.total"), alignment: "end", isSecondary: true, render: (line) => formatWholeRupees(line.unitCostAmount) },
    );
    return columns;
  }, [isReceivable, isSending, translateMessage]);

  async function handleScan(barcode: string, quantity: number): Promise<boolean> {
    setErrorMessage(undefined);
    const key = `${barcode}|${quantity}`;
    const scanBatchId = failedScanReference.current?.key === key ? failedScanReference.current.scanBatchId : createClientTransactionId();
    const result = await apiRequest<TransferScanResultResponse>(isSending ? ApiEndpoints.inventory.stockTransfers.sendScans(transferId) : ApiEndpoints.inventory.stockTransferReceiving.scans(transferId), { method: "POST", body: { barcode, quantity, scanBatchId }, idempotencyKey: scanBatchId });
    if (!result.ok) {
      // A scan that did not reach the server (or got no answer) is sent again with the same id: a lost answer can never count the pieces twice.
      failedScanReference.current = result.kind === "offline" || result.kind === "serverError" ? { key, scanBatchId } : undefined;
      setErrorMessage(result.problem.message);
      return false;
    }
    failedScanReference.current = undefined;
    const counted = isSending ? result.data.quantityScanned : result.data.quantityReceived;
    showToast(translateMessage("inventory.transfer.scanned", { product: result.data.productName, size: result.data.sizeCode, count: formatQuantity(counted) }), ToneNames.success);
    transfer.refetch();
    return true;
  }

  async function handleConfirmed() {
    if (!confirm) return;
    setIsWorking(true);
    setErrorMessage(undefined);
    const result =
      confirm === "dispatch"
        ? await apiRequest<StockTransferResponse>(ApiEndpoints.inventory.stockTransfers.dispatch(transferId), { method: "POST", body: {} })
        : confirm === "cancel"
          ? await apiRequest<StockTransferResponse>(ApiEndpoints.inventory.stockTransfers.cancel(transferId), { method: "POST", body: { reason: null } })
          : await apiRequest<StockTransferResponse>(ApiEndpoints.inventory.stockTransferReceiving.complete(transferId), { method: "POST", body: {} });
    setIsWorking(false);
    setConfirm(undefined);
    if (!result.ok) return setErrorMessage(result.problem.message);
    showToast(
      translateMessage(confirm === "dispatch" ? "inventory.transfer.dispatched" : confirm === "cancel" ? "inventory.transfer.cancelled" : "inventory.transfer.completed", { number: result.data.transferNumber }),
      ToneNames.success,
    );
    transfer.refetch();
    onChanged();
  }

  return (
    <SectionCard
      title={current ? translateMessage("inventory.transfer.panel.title", { number: current.transferNumber, from: current.fromStoreName, to: current.toStoreName }) : undefined}
      action={
        <Button type="button" variant="outline" className="print:hidden" onClick={onClosed}>
          {translateMessage("inventory.common.close")}
        </Button>
      }
    >
      {transfer.status === "loading" && !current && <LoadingIndicator />}
      {transfer.status === "error" && <FormResultNotice errorMessage={transfer.problem?.message ?? translateMessage("inventory.transfer.failed")} />}
      {current && (
        <div className="space-y-4">
          <PrintedReportHeading title={translateMessage("inventory.transfer.panel.title", { number: current.transferNumber, from: current.fromStoreName, to: current.toStoreName })} />
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">{translateMessage("inventory.detail.status")}</dt>
              <dd>
                <InventoryStatusBadge statusCode={current.statusCode} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{translateMessage("inventory.transfer.column.shipped")}</dt>
              <dd className="font-medium tabular-nums">{formatQuantity(isDraft ? current.quantityScanned : current.quantityShipped)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{translateMessage("inventory.transfer.column.received")}</dt>
              <dd className="font-medium tabular-nums">{formatQuantity(current.quantityReceived)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{translateMessage("inventory.transfer.column.missing")}</dt>
              <dd className="font-medium tabular-nums">{formatQuantity(current.quantityMissing)}</dd>
            </div>
            {current.note && (
              <div className="sm:col-span-2 lg:col-span-4">
                <dt className="text-muted-foreground">{translateMessage("inventory.common.description")}</dt>
                <dd>{current.note}</dd>
              </div>
            )}
          </dl>

          {canScan && <BarcodeScanBox onScan={handleScan} maximumQuantity={MAXIMUM_PIECES_PER_TRANSFER_SCAN} isDisabled={isWorking} />}
          {isSending && isDraft && <InlineNotice tone={ToneNames.info}>{translateMessage("inventory.transfer.draftNotice")}</InlineNotice>}
          {!isSending && isReceivable && <InlineNotice tone={ToneNames.info}>{translateMessage("inventory.transfer.receivingNotice")}</InlineNotice>}
          <FormResultNotice errorMessage={errorMessage} />

          <DataGridTable
            rows={current.lines}
            columns={lineColumns}
            getRowKey={(line) => line.lineId}
            caption={translateMessage("inventory.detail.linesCaption")}
            emptyTitle={translateMessage("inventory.transfer.noLines")}
            emptyText={isSending ? translateMessage("inventory.transfer.noLinesSend") : undefined}
          />

          {current.lossCases.length > 0 && <LossCaseList lossCases={current.lossCases} />}

          <div className="flex flex-wrap gap-2 print:hidden">
            {isSending && isDraft && maySend && (
              <Button type="button" onClick={() => setConfirm("dispatch")} disabled={isWorking || current.quantityScanned <= 0}>
                {translateMessage("inventory.transfer.dispatch")}
              </Button>
            )}
            {isSending && isDraft && mayCancel && (
              <Button type="button" variant="destructive" onClick={() => setConfirm("cancel")} disabled={isWorking}>
                {translateMessage("inventory.transfer.cancel")}
              </Button>
            )}
            {!isSending && isReceivable && mayComplete && (
              <Button type="button" onClick={() => setConfirm("complete")} disabled={isWorking}>
                {translateMessage("inventory.transfer.complete")}
              </Button>
            )}
            {mayPrint && (
              <Button type="button" variant="outline" onClick={() => window.print()}>
                <Printer />
                {translateMessage("inventory.common.print")}
              </Button>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirm !== undefined}
        onOpenChange={(open) => !open && setConfirm(undefined)}
        onConfirm={handleConfirmed}
        isPending={isWorking}
        isDestructive={confirm === "cancel"}
        titleMessageKey={confirm === "dispatch" ? "inventory.transfer.dispatchConfirm.title" : confirm === "cancel" ? "inventory.transfer.cancelConfirm.title" : "inventory.transfer.completeConfirm.title"}
        descriptionMessageKey={confirm === "dispatch" ? "inventory.transfer.dispatchConfirm.text" : confirm === "cancel" ? "inventory.transfer.cancelConfirm.text" : "inventory.transfer.completeConfirm.text"}
        confirmLabelMessageKey={confirm === "dispatch" ? "inventory.transfer.dispatch" : confirm === "cancel" ? "inventory.transfer.cancel" : "inventory.transfer.complete"}
      />
    </SectionCard>
  );
}

function LossCaseList({ lossCases }: { lossCases: readonly TransferLossCaseResponse[] }) {
  const { translateMessage } = useTranslation();
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{translateMessage("inventory.transfer.lossCases")}</h3>
      <ul className="divide-y rounded-lg border text-sm">
        {lossCases.map((lossCase) => (
          <li key={lossCase.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span>
              {lossCase.productName} ({lossCase.sizeCode}) × {formatQuantity(lossCase.quantity)}
              {lossCase.bearerCode ? ` — ${translateMessage(bearerMessageKey(lossCase.bearerCode))}` : ""}
            </span>
            <InventoryStatusBadge statusCode={lossCase.statusCode} />
          </li>
        ))}
      </ul>
    </div>
  );
}
