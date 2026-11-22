"use client";

import { Plus, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api/apiRequest";
import { uploadApiFile } from "@/lib/api/fileTransfer";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { CatalogueLimits } from "../logic/catalogueLimits";
import type {
  BarcodeHistoryEntryResponse,
  BarcodeReplacementPairRequest,
  BarcodeReplacementPreviewResponse,
  BarcodeReplacementRowResponse,
  BarcodesReplacedResponse,
  ReplaceBarcodesRequest,
} from "../types/catalogueTypes";

const REASON_MAXIMUM_LENGTH = 200;
const ACCEPTED_FILE_TYPES = ".xlsx,.csv";

type EditablePair = BarcodeReplacementPairRequest & { rowKey: number };

// Replace Barcodes (docx 4.13): swap the barcode of many sizes at once. The pairs (old barcode, new barcode) come from an Excel / CSV
// file (column A old, column B new) or are typed in. "Check" shows every row with the product it belongs to and the problem of each
// bad row; nothing changes until "Replace" is pressed, and only when every row is good. Every replacement is written to the
// history below, so a barcode can always be traced back.
export function ReplaceBarcodesPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const mayReplace = hasPermission(PermissionCodes.PRODUCTS.REPLACE_BARCODES.EDIT);
  const fileInputReference = useRef<HTMLInputElement>(null);
  const nextRowKey = useRef(1);
  const transactionIdReference = useRef<string | null>(null);

  const [pairs, setPairs] = useState<EditablePair[]>(() => [{ rowKey: 0, oldBarcode: "", newBarcode: "" }]);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<BarcodeReplacementPreviewResponse | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [resultMessage, setResultMessage] = useState<string>();
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const filledPairs = pairs.filter((pair) => pair.oldBarcode.trim() !== "" || pair.newBarcode.trim() !== "");
  const canReplace = mayReplace && preview !== null && preview.invalidRowCount === 0 && preview.validRowCount > 0;

  function buildRequest(clientTransactionId: string | null): Omit<ReplaceBarcodesRequest, "clientTransactionId"> & { clientTransactionId: string | null } {
    return {
      pairs: filledPairs.map((pair) => ({ oldBarcode: pair.oldBarcode.trim(), newBarcode: pair.newBarcode.trim() })),
      reason: reason.trim() === "" ? null : reason.trim(),
      clientTransactionId,
    };
  }

  function edited() {
    setPreview(null);
    setResultMessage(undefined);
    transactionIdReference.current = null;
  }

  function changePair(rowKey: number, field: "oldBarcode" | "newBarcode", value: string) {
    edited();
    setPairs((current) => current.map((pair) => (pair.rowKey === rowKey ? { ...pair, [field]: value } : pair)));
  }

  function addRow() {
    setPairs((current) => [...current, { rowKey: nextRowKey.current++, oldBarcode: "", newBarcode: "" }]);
  }

  function removeRow(rowKey: number) {
    edited();
    setPairs((current) => (current.length === 1 ? [{ rowKey: nextRowKey.current++, oldBarcode: "", newBarcode: "" }] : current.filter((pair) => pair.rowKey !== rowKey)));
  }

  async function checkPairs() {
    if (filledPairs.length === 0) return setErrorMessage(translateMessage("catalogue.replaceBarcodes.noPairs"));
    if (filledPairs.length > CatalogueLimits.maximumReplacementRows) return setErrorMessage(translateMessage("catalogue.replaceBarcodes.tooManyRows", { count: CatalogueLimits.maximumReplacementRows }));
    setIsWorking(true);
    setErrorMessage(undefined);
    const result = await apiRequest<BarcodeReplacementPreviewResponse>(ApiEndpoints.barcodes.replacementPreview, { method: "POST", body: buildRequest(null) });
    setIsWorking(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    setResultMessage(undefined);
    setPreview(result.data);
  }

  async function importFile(file: File) {
    setIsWorking(true);
    setErrorMessage(undefined);
    const result = await uploadApiFile<BarcodeReplacementPreviewResponse>(ApiEndpoints.barcodes.replacementFile, file, "POST");
    setIsWorking(false);
    if (fileInputReference.current) fileInputReference.current.value = "";
    if (!result.ok) return setErrorMessage(result.problem.message);
    transactionIdReference.current = null;
    setResultMessage(undefined);
    setPairs(result.data.rows.map((row) => ({ rowKey: nextRowKey.current++, oldBarcode: row.oldBarcode, newBarcode: row.newBarcode })));
    setPreview(result.data);
  }

  async function replace() {
    transactionIdReference.current ??= createClientTransactionId();
    const body = buildRequest(transactionIdReference.current) as ReplaceBarcodesRequest;
    setIsWorking(true);
    setErrorMessage(undefined);
    const result = await apiRequest<BarcodesReplacedResponse>(ApiEndpoints.barcodes.replace, { method: "POST", body, idempotencyKey: body.clientTransactionId });
    setIsWorking(false);
    setIsConfirming(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    transactionIdReference.current = null;
    setResultMessage(translateMessage("catalogue.replaceBarcodes.replaced", { count: result.data.replacedCount }));
    showToast(translateMessage("catalogue.toast.barcodesReplaced"), ToneNames.success);
    setPairs([{ rowKey: nextRowKey.current++, oldBarcode: "", newBarcode: "" }]);
    setReason("");
    setPreview(null);
    setHistoryRefresh((counter) => counter + 1);
  }

  const previewColumns = useMemo<DataGridColumn<BarcodeReplacementRowResponse>[]>(
    () => [
      { key: "rowNumber", header: translateMessage("catalogue.replaceBarcodes.row"), render: (row) => row.rowNumber },
      { key: "oldBarcode", header: translateMessage("catalogue.replaceBarcodes.oldBarcode"), render: (row) => <span dir="ltr">{row.oldBarcode}</span> },
      { key: "newBarcode", header: translateMessage("catalogue.replaceBarcodes.newBarcode"), render: (row) => <span dir="ltr">{row.newBarcode}</span> },
      { key: "productName", header: translateMessage("catalogue.field.productName"), render: (row) => (row.productName ? `${row.productName}${row.sizeCode ? ` (${row.sizeCode})` : ""}` : "") },
      {
        key: "problem",
        header: translateMessage("catalogue.replaceBarcodes.result"),
        render: (row) => (row.isValid ? <Badge variant="secondary">{translateMessage("catalogue.replaceBarcodes.rowOk")}</Badge> : <Badge variant="destructive">{row.problem}</Badge>),
      },
    ],
    [translateMessage],
  );

  const historyColumns = useMemo<DataGridColumn<BarcodeHistoryEntryResponse>[]>(
    () => [
      { key: "changedAt", header: translateMessage("catalogue.replaceBarcodes.changedAt"), render: (row) => new Date(row.changedAt).toLocaleString() },
      { key: "productName", header: translateMessage("catalogue.field.productName"), render: (row) => `${row.productName} (${row.sizeCode})` },
      { key: "oldBarcode", header: translateMessage("catalogue.replaceBarcodes.oldBarcode"), render: (row) => <span dir="ltr">{row.oldBarcode}</span> },
      { key: "newBarcode", header: translateMessage("catalogue.replaceBarcodes.newBarcode"), render: (row) => <span dir="ltr">{row.newBarcode}</span> },
      { key: "reason", header: translateMessage("catalogue.replaceBarcodes.reason"), isSecondary: true, render: (row) => row.reason ?? "" },
      { key: "changedByName", header: translateMessage("catalogue.replaceBarcodes.changedBy"), isSecondary: true, render: (row) => row.changedByName ?? "" },
    ],
    [translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.replaceBarcodes")} subtitle={translateMessage("catalogue.replaceBarcodes.subtitle")} />
      {mayReplace && (
        <SectionCard
          title={translateMessage("catalogue.replaceBarcodes.pairsTitle")}
          description={translateMessage("catalogue.replaceBarcodes.fileHint")}
          action={
            <>
              <input ref={fileInputReference} type="file" accept={ACCEPTED_FILE_TYPES} className="sr-only" aria-label={translateMessage("catalogue.replaceBarcodes.importFile")} onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }} />
              <Button type="button" variant="outline" disabled={isWorking} onClick={() => fileInputReference.current?.click()}>
                <Upload />
                {translateMessage("catalogue.replaceBarcodes.importFile")}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {pairs.map((pair, index) => (
              <div key={pair.rowKey} className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1">
                  <FormField label={translateMessage("catalogue.replaceBarcodes.oldBarcode")} name={`catalogueOldBarcode${pair.rowKey}`}>
                    {(controlProps) => <Input {...controlProps} dir="ltr" autoComplete="off" value={pair.oldBarcode} maxLength={CatalogueLimits.barcodeMaximumLength} onChange={(event) => changePair(pair.rowKey, "oldBarcode", event.target.value)} />}
                  </FormField>
                </div>
                <div className="min-w-48 flex-1">
                  <FormField label={translateMessage("catalogue.replaceBarcodes.newBarcode")} name={`catalogueNewBarcode${pair.rowKey}`}>
                    {(controlProps) => <Input {...controlProps} dir="ltr" autoComplete="off" value={pair.newBarcode} maxLength={CatalogueLimits.barcodeMaximumLength} onChange={(event) => changePair(pair.rowKey, "newBarcode", event.target.value)} />}
                  </FormField>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={translateMessage("masterData.action.delete")} onClick={() => removeRow(pair.rowKey)}>
                  <Trash2 />
                </Button>
                {index === pairs.length - 1 && (
                  <Button type="button" variant="outline" onClick={addRow}>
                    <Plus />
                    {translateMessage("catalogue.replaceBarcodes.addRow")}
                  </Button>
                )}
              </div>
            ))}
            <FormField label={translateMessage("catalogue.replaceBarcodes.reason")} name="catalogueReplaceReason" hint={translateMessage("catalogue.replaceBarcodes.reasonHint")}>
              {(controlProps) => <Textarea {...controlProps} rows={2} maxLength={REASON_MAXIMUM_LENGTH} value={reason} onChange={(event) => { edited(); setReason(event.target.value); }} />}
            </FormField>
            <Button type="button" disabled={isWorking} onClick={checkPairs}>
              {translateMessage("catalogue.replaceBarcodes.check")}
            </Button>
          </div>
        </SectionCard>
      )}
      <FormResultNotice errorMessage={errorMessage} successMessage={resultMessage} />
      {preview && (
        <SectionCard
          title={translateMessage("catalogue.replaceBarcodes.previewTitle")}
          description={translateMessage("catalogue.replaceBarcodes.previewSummary", { valid: preview.validRowCount, invalid: preview.invalidRowCount })}
          isPadded={false}
          action={
            mayReplace && (
              <Button type="button" disabled={!canReplace || isWorking} onClick={() => setIsConfirming(true)}>
                {translateMessage("catalogue.replaceBarcodes.replace")}
              </Button>
            )
          }
        >
          {preview.invalidRowCount > 0 && (
            <div className="px-5 pt-4 sm:px-6">
              <InlineNotice tone={ToneNames.warning}>{translateMessage("catalogue.replaceBarcodes.fixRows")}</InlineNotice>
            </div>
          )}
          <DataGridTable rows={preview.rows} columns={previewColumns} getRowKey={(row) => String(row.rowNumber)} caption={translateMessage("catalogue.replaceBarcodes.previewTitle")} emptyTitle={translateMessage("catalogue.replaceBarcodes.noPairs")} />
        </SectionCard>
      )}
      <SectionCard title={translateMessage("catalogue.replaceBarcodes.historyTitle")} isPadded={false}>
        <ServerPaginatedDataGrid<BarcodeHistoryEntryResponse>
          path={ApiEndpoints.barcodes.history}
          columns={historyColumns}
          getRowKey={(row) => row.id}
          caption={translateMessage("catalogue.replaceBarcodes.historyTitle")}
          emptyTitle={translateMessage("catalogue.replaceBarcodes.historyEmpty")}
          filters={{ refreshKey: historyRefresh }}
          searchPlaceholder={translateMessage("catalogue.replaceBarcodes.historySearch")}
        />
      </SectionCard>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        onConfirm={replace}
        isPending={isWorking}
        isDestructive={false}
        titleMessageKey="catalogue.replaceBarcodes.confirmTitle"
        descriptionMessageKey="catalogue.replaceBarcodes.confirmText"
        confirmLabelMessageKey="catalogue.replaceBarcodes.replace"
      />
    </div>
  );
}
