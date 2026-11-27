"use client";

import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { showToast } from "@/lib/toast/toastStore";
import { PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { kindMessageKey } from "../logic/inventoryStatusPresentation";
import {
  InventoryDocumentStatusCodes,
  StockAdjustmentKindCodes,
  type StockAdjustmentListItemResponse,
  type StockAdjustmentResponse,
  type VoidStockAdjustmentResponse,
} from "../types/inventoryTypes";
import { InventoryStatusBadge } from "./InventoryStatusBadge";
import { StockAdjustmentDetailCard } from "./StockAdjustmentDetailCard";

// The history of stock adjustments of the working store: every adjustment ever posted, with the voids. Opening one shows its lines, lets the person print it, and
// (with the delete permission) void it: the void is a new document that undoes the adjustment, the original stays in the history marked cancelled.
export function StockAdjustmentHistoryPanel({ storeId, refreshToken }: { storeId: string; refreshToken: number }) {
  const { translateMessage } = useTranslation();
  const [gridVersion, setGridVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();

  const columns = useMemo<DataGridColumn<StockAdjustmentListItemResponse>[]>(
    () => [
      { key: "documentNumber", header: translateMessage("inventory.detail.number"), isSortable: false, render: (row) => row.documentNumber, alignment: "end" },
      { key: "date", header: translateMessage("inventory.common.date"), render: (row) => row.adjustmentDate },
      { key: "kind", header: translateMessage("inventory.detail.kind"), render: (row) => translateMessage(kindMessageKey(row.kindCode)) },
      { key: "description", header: translateMessage("inventory.common.description"), isSecondary: true, render: (row) => row.description ?? "" },
      { key: "added", header: translateMessage("inventory.column.added"), alignment: "end", render: (row) => formatQuantity(row.addedQuantity) },
      { key: "removed", header: translateMessage("inventory.column.removed"), alignment: "end", render: (row) => formatQuantity(row.removedQuantity) },
      { key: "value", header: translateMessage("inventory.column.total"), alignment: "end", render: (row) => formatWholeRupees(row.netValueAmount) },
      { key: "status", header: translateMessage("inventory.detail.status"), render: (row) => <InventoryStatusBadge statusCode={row.statusCode} /> },
    ],
    [translateMessage],
  );

  return (
    <>
      <ServerPaginatedDataGrid<StockAdjustmentListItemResponse>
        key={`${gridVersion}-${refreshToken}-${storeId}`}
        path={ApiEndpoints.inventory.stockAdjustments.list}
        fixedFilters={{ storeId }}
        columns={columns}
        getRowKey={(row) => row.id}
        caption={translateMessage("inventory.adjustment.history.caption")}
        emptyTitle={translateMessage("inventory.adjustment.history.empty")}
        searchPlaceholder={translateMessage("inventory.adjustment.history.search")}
        onRowOpen={(row) => setSelectedId(row.id)}
      />
      <AdjustmentDetailDialog
        adjustmentId={selectedId}
        onClose={() => setSelectedId(undefined)}
        onVoided={() => {
          setSelectedId(undefined);
          setGridVersion((version) => version + 1);
        }}
      />
    </>
  );
}

function AdjustmentDetailDialog({ adjustmentId, onClose, onVoided }: { adjustmentId: string | undefined; onClose: () => void; onVoided: () => void }) {
  const { translateMessage } = useTranslation();
  const detail = useApiQuery<StockAdjustmentResponse>(adjustmentId ? ApiEndpoints.inventory.stockAdjustments.byId(adjustmentId) : "", { enabled: adjustmentId !== undefined });
  const [reason, setReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const { hasPermission } = usePermissions();
  const mayVoid = hasPermission(PermissionCodes.INVOICE.STOCK_ADJUSTMENT.DELETE);
  const mayPrint = hasPermission(PermissionCodes.INVOICE.STOCK_ADJUSTMENT.PRINT);
  const adjustment = detail.data;
  const canBeVoided = adjustment !== undefined && adjustment.statusCode === InventoryDocumentStatusCodes.posted && adjustment.kindCode !== StockAdjustmentKindCodes.reversal;

  async function handleVoid() {
    if (!adjustment) return;
    if (reason.trim() === "") return setErrorMessage(translateMessage("inventory.adjustment.void.reasonNeeded"));
    setIsVoiding(true);
    setErrorMessage(undefined);
    const result = await apiRequest<VoidStockAdjustmentResponse>(ApiEndpoints.inventory.stockAdjustments.voidAdjustment(adjustment.id), {
      method: "POST",
      body: { reason: reason.trim(), clientTransactionId: createClientTransactionId() },
    });
    setIsVoiding(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    showToast(translateMessage("inventory.adjustment.void.done", { number: adjustment.documentNumber }), "success");
    setReason("");
    onVoided();
  }

  return (
    <Dialog open={adjustmentId !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{translateMessage("inventory.adjustment.detail.title", { number: adjustment?.documentNumber ?? "" })}</DialogTitle>
          <DialogDescription>{translateMessage("inventory.adjustment.detail.subtitle")}</DialogDescription>
        </DialogHeader>
        {detail.status === "loading" && <LoadingIndicator />}
        {detail.status === "error" && <FormResultNotice errorMessage={detail.problem?.message ?? translateMessage("inventory.adjustment.detail.failed")} />}
        {adjustment && (
          <>
            <PrintedReportHeading title={translateMessage("inventory.adjustment.detail.title", { number: adjustment.documentNumber })} />
            <StockAdjustmentDetailCard adjustment={adjustment} />
            {canBeVoided && mayVoid && (
              <div className="space-y-1.5 print:hidden">
                <Label htmlFor="adjustment-void-reason">{translateMessage("inventory.adjustment.void.reason")}</Label>
                <Textarea id="adjustment-void-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} rows={2} />
                <p className="text-xs text-muted-foreground">{translateMessage("inventory.adjustment.void.hint")}</p>
              </div>
            )}
            <FormResultNotice errorMessage={errorMessage} />
          </>
        )}
        <DialogFooter className="print:hidden">
          {adjustment && mayPrint && (
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer />
              {translateMessage("inventory.common.print")}
            </Button>
          )}
          {canBeVoided && mayVoid && (
            <Button type="button" variant="destructive" onClick={handleVoid} disabled={isVoiding}>
              {translateMessage("inventory.adjustment.void.confirm")}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            {translateMessage("inventory.common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
