"use client";

import { Printer } from "lucide-react";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import type { PaginatedResponse } from "@/lib/types/pagination";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import { BarcodeScanBox } from "../components/BarcodeScanBox";
import { ChooseStoreNotice } from "../components/ChooseStoreNotice";
import { StockAuditComparisonTable } from "../components/StockAuditComparisonTable";
import { useInventoryWorkingStore } from "../hooks/useInventoryWorkingStore";
import {
  InventoryDocumentStatusCodes,
  type CreateStockAuditRequest,
  type StockAuditListItemResponse,
  type StockAuditResponse,
  type StockAuditScanResultResponse,
} from "../types/inventoryTypes";

const MAXIMUM_PIECES_PER_AUDIT_SCAN = 1000;

// Stock Audit (docx 5.12, Part 10): start a count, scan every piece on the shelves, see the comparison with the books, and press "Adjust Stock" to post the
// differences. Scanning never moves stock: the count is kept apart until it is posted. "Add Non-Scanned Items" shows (and, when posted, books at zero) the sizes with stock
// that were not scanned. A posted audit is history; "Delete" is only for an audit that is still being counted.
export function StockAuditPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const { storeId, storeName } = useInventoryWorkingStore();
  const [auditId, setAuditId] = useState<string>();
  const mayStart = hasPermission(PermissionCodes.INVOICE.STOCK_AUDIT.ADD) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.STOCK_AUDIT);

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.audit.title")} subtitle={translateMessage("inventory.audit.subtitle", { store: storeName })} />
      {storeId === null ? (
        <ChooseStoreNotice />
      ) : auditId === undefined ? (
        <StartOrContinueAudit storeId={storeId} mayStart={mayStart} onAuditChosen={setAuditId} />
      ) : (
        <OpenAudit auditId={auditId} onClosed={() => setAuditId(undefined)} />
      )}
    </div>
  );
}

function StartOrContinueAudit({ storeId, mayStart, onAuditChosen }: { storeId: string; mayStart: boolean; onAuditChosen: (auditId: string) => void }) {
  const { translateMessage } = useTranslation();
  const transactionIdReference = useRef(createClientTransactionId());
  const [auditDate, setAuditDate] = useState(todayAsIsoDate());
  const [note, setNote] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const openAudits = useApiQuery<PaginatedResponse<StockAuditListItemResponse>>(ApiEndpoints.inventory.stockAudits.list, {
    query: { storeId, statusCode: InventoryDocumentStatusCodes.draft },
  });

  async function handleStart() {
    if (!isValidIsoDate(auditDate)) return setErrorMessage(translateMessage("fields.invalidDate"));
    setIsStarting(true);
    setErrorMessage(undefined);
    const request: CreateStockAuditRequest = { storeId, auditDate, clientTransactionId: transactionIdReference.current, note: note.trim() === "" ? null : note.trim() };
    const result = await apiRequest<StockAuditResponse>(ApiEndpoints.inventory.stockAudits.list, { method: "POST", body: request, idempotencyKey: transactionIdReference.current });
    setIsStarting(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    transactionIdReference.current = createClientTransactionId();
    onAuditChosen(result.data.id);
  }

  const open = openAudits.data?.items ?? [];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {mayStart && (
        <SectionCard title={translateMessage("inventory.audit.start.title")} description={translateMessage("inventory.audit.start.text")}>
          <div className="space-y-4">
            <DateField label={translateMessage("inventory.common.date")} name="auditDate" value={auditDate} onValueChange={setAuditDate} maximumIsoDate={todayAsIsoDate()} isRequired />
            <TextInputField label={translateMessage("inventory.audit.note")} name="auditNote" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
            <FormResultNotice errorMessage={errorMessage} />
            <Button type="button" onClick={handleStart} disabled={isStarting}>
              {translateMessage("inventory.audit.start.button")}
            </Button>
          </div>
        </SectionCard>
      )}
      <SectionCard title={translateMessage("inventory.audit.open.title")} description={translateMessage("inventory.audit.open.text")}>
        {openAudits.status === "loading" && <LoadingIndicator />}
        {openAudits.status === "success" && open.length === 0 && <p className="text-sm text-muted-foreground">{translateMessage("inventory.audit.open.none")}</p>}
        <ul className="space-y-2">
          {open.map((audit) => (
            <li key={audit.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
              <span>
                {translateMessage("inventory.audit.open.item", { number: audit.documentNumber, date: audit.auditDate, pieces: formatQuantity(audit.scannedPieceCount) })}
              </span>
              <Button type="button" variant="outline" onClick={() => onAuditChosen(audit.id)}>
                {translateMessage("inventory.audit.open.continue")}
              </Button>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

function OpenAudit({ auditId, onClosed }: { auditId: string; onClosed: () => void }) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const [includeUnscannedItems, setIncludeUnscannedItems] = useState(false);
  const [isPostConfirmOpen, setIsPostConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  // A scan that failed on the way is sent again with the SAME id, so a lost answer can never count the pieces twice.
  const failedScanReference = useRef<{ key: string; deviceScanId: string }>(undefined);
  const audit = useApiQuery<StockAuditResponse>(ApiEndpoints.inventory.stockAudits.byId(auditId), { query: { includeUnscannedItems } });
  const current = audit.data;
  const isCounting = current?.statusCode === InventoryDocumentStatusCodes.draft;
  const mayScan = hasPermission(PermissionCodes.INVOICE.STOCK_AUDIT.EDIT) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.STOCK_AUDIT);
  const mayPost = hasPermission(PermissionCodes.INVOICE.STOCK_AUDIT.APPROVE) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.STOCK_AUDIT);
  const mayDelete = hasPermission(PermissionCodes.INVOICE.STOCK_AUDIT.DELETE) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.STOCK_AUDIT);
  const mayPrint = hasPermission(PermissionCodes.INVOICE.STOCK_AUDIT.PRINT);

  async function handleScan(barcode: string, quantity: number): Promise<boolean> {
    setErrorMessage(undefined);
    const key = `${barcode}|${quantity}`;
    const deviceScanId = failedScanReference.current?.key === key ? failedScanReference.current.deviceScanId : createClientTransactionId();
    const result = await apiRequest<StockAuditScanResultResponse>(ApiEndpoints.inventory.stockAudits.scans(auditId), {
      method: "POST",
      body: { barcode, quantity, deviceScanId },
      idempotencyKey: deviceScanId,
    });
    if (!result.ok) {
      failedScanReference.current = result.kind === "offline" || result.kind === "serverError" ? { key, deviceScanId } : undefined;
      setErrorMessage(result.problem.message);
      return false;
    }
    failedScanReference.current = undefined;
    showToast(translateMessage("inventory.audit.scanned", { product: result.data.productName, size: result.data.sizeCode, count: formatQuantity(result.data.countedQuantity) }), ToneNames.success);
    audit.refetch();
    return true;
  }

  async function handlePost() {
    setIsWorking(true);
    setErrorMessage(undefined);
    const result = await apiRequest<StockAuditResponse>(ApiEndpoints.inventory.stockAudits.post(auditId), { method: "POST", body: { includeUnscannedItems } });
    setIsWorking(false);
    setIsPostConfirmOpen(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    showToast(translateMessage("inventory.audit.posted", { number: result.data.documentNumber }), ToneNames.success);
    audit.refetch();
  }

  async function handleDelete() {
    setIsWorking(true);
    const result = await apiRequest<void>(ApiEndpoints.inventory.stockAudits.byId(auditId), { method: "DELETE" });
    setIsWorking(false);
    setIsDeleteConfirmOpen(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    showToast(translateMessage("inventory.audit.deleted"), ToneNames.success);
    onClosed();
  }

  return (
    <div className="space-y-4">
      {audit.status === "loading" && !current && <LoadingIndicator />}
      {audit.status === "error" && <FormResultNotice errorMessage={audit.problem?.message ?? translateMessage("inventory.audit.failed")} />}
      {current && (
        <>
          {isCounting && mayScan && (
            <SectionCard title={translateMessage("inventory.audit.scan.title")} description={translateMessage("inventory.audit.scan.text")}>
              <BarcodeScanBox onScan={handleScan} maximumQuantity={MAXIMUM_PIECES_PER_AUDIT_SCAN} minimumQuantity={-MAXIMUM_PIECES_PER_AUDIT_SCAN} isDisabled={isWorking} />
            </SectionCard>
          )}
          {!isCounting && <InlineNotice tone={ToneNames.info}>{translateMessage("inventory.audit.notCounting")}</InlineNotice>}
          <FormResultNotice errorMessage={errorMessage} />
          <SectionCard>
            <PrintedReportHeading title={translateMessage("inventory.audit.report.title", { number: current.documentNumber })} />
            <StockAuditComparisonTable audit={current} />
          </SectionCard>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            {isCounting && (
              <div className="flex items-center gap-2">
                <Checkbox id="audit-include-unscanned" checked={includeUnscannedItems} onCheckedChange={(checked) => setIncludeUnscannedItems(checked === true)} />
                <Label htmlFor="audit-include-unscanned">{translateMessage("inventory.audit.addNonScanned")}</Label>
              </div>
            )}
            {isCounting && mayPost && (
              <Button type="button" onClick={() => setIsPostConfirmOpen(true)} disabled={isWorking || current.lines.length === 0}>
                {translateMessage("inventory.audit.adjustStock")}
              </Button>
            )}
            {isCounting && mayDelete && (
              <Button type="button" variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)} disabled={isWorking}>
                {translateMessage("inventory.common.delete")}
              </Button>
            )}
            {mayPrint && (
              <Button type="button" variant="outline" onClick={() => window.print()}>
                <Printer />
                {translateMessage("inventory.common.print")}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClosed}>
              {translateMessage("inventory.common.close")}
            </Button>
          </div>
        </>
      )}
      <ConfirmDialog
        open={isPostConfirmOpen}
        onOpenChange={setIsPostConfirmOpen}
        onConfirm={handlePost}
        isPending={isWorking}
        isDestructive={false}
        titleMessageKey="inventory.audit.postConfirm.title"
        descriptionMessageKey="inventory.audit.postConfirm.text"
        confirmLabelMessageKey="inventory.audit.adjustStock"
      />
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        onConfirm={handleDelete}
        isPending={isWorking}
        titleMessageKey="inventory.audit.deleteConfirm.title"
        descriptionMessageKey="inventory.audit.deleteConfirm.text"
        confirmLabelMessageKey="inventory.common.delete"
      />
    </div>
  );
}
