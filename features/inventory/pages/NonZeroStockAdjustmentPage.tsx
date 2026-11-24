"use client";

import { Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/apiRequest";
import { uploadApiFile } from "@/lib/api/fileTransfer";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity, parseQuantityInput } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import { ExportCsvButton } from "@/features/catalogue/components/ExportCsvButton";
import { fetchAllPagesOfList } from "@/features/catalogue/hooks/fetchAllPagesOfList";
import { ChooseStoreNotice } from "../components/ChooseStoreNotice";
import { useInventoryWorkingStore } from "../hooks/useInventoryWorkingStore";
import type { CreateStockCountUpdateRequest, NonZeroStockRowResponse, StockAdjustmentResponse, StockCountFilePreviewResponse } from "../types/inventoryTypes";

const MAXIMUM_PROBLEMS_SHOWN = 8;

// Stock Adjustment (Non Zero Stock) (docx 5.8): every size with stock in the working store, with its stock in the books; type the counted stock (or load it from a
// count file) and press Update. Only the sizes whose count differs from the books are posted, as one adjustment of the kind "count update".
export function NonZeroStockAdjustmentPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const { storeId, storeName } = useInventoryWorkingStore();
  const transactionIdReference = useRef(createClientTransactionId());
  const fileInputReference = useRef<HTMLInputElement>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [updateDate, setUpdateDate] = useState(todayAsIsoDate());
  const [description, setDescription] = useState("");
  const [gridVersion, setGridVersion] = useState(0);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [problems, setProblems] = useState<StockCountFilePreviewResponse["problems"]>([]);

  const mayUpdate = hasPermission(PermissionCodes.INVOICE.STOCK_ADJUSTMENT_NON_ZERO_STOCK.EDIT) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.STOCK_ADJUST);
  const mayExport = hasPermission(PermissionCodes.INVOICE.STOCK_ADJUSTMENT_NON_ZERO_STOCK.EXPORT);
  const enteredCounts = useMemo(
    () =>
      Object.entries(counts)
        .map(([variantId, text]) => ({ variantId, countedQuantity: parseQuantityInput(text) }))
        .filter((entry): entry is { variantId: string; countedQuantity: number } => entry.countedQuantity !== null && entry.countedQuantity >= 0),
    [counts],
  );

  const columns = useMemo<DataGridColumn<NonZeroStockRowResponse>[]>(
    () => [
      { key: "barcode", header: translateMessage("inventory.column.barcode"), render: (row) => <span dir="ltr">{row.barcode}</span> },
      { key: "product", header: translateMessage("inventory.column.product"), render: (row) => `${row.productName} (${row.sizeCode})` },
      { key: "purchase", header: translateMessage("inventory.column.purchasePrice"), alignment: "end", render: (row) => formatWholeRupees(row.purchasePriceAmount) },
      { key: "stock", header: translateMessage("inventory.column.inStock"), alignment: "end", render: (row) => formatQuantity(row.stockQuantity) },
      {
        key: "count",
        header: translateMessage("inventory.nonZero.counted"),
        alignment: "end",
        render: (row) => (
          <Input
            aria-label={translateMessage("inventory.nonZero.countedFor", { product: `${row.productName} (${row.sizeCode})` })}
            className="ms-auto w-28 text-end"
            inputMode="decimal"
            dir="ltr"
            disabled={!mayUpdate}
            value={counts[row.variantId] ?? ""}
            placeholder={formatQuantity(row.stockQuantity)}
            onChange={(event) => setCounts((current) => ({ ...current, [row.variantId]: event.target.value }))}
          />
        ),
      },
    ],
    [counts, mayUpdate, translateMessage],
  );

  async function handleFileChosen(file: File | undefined) {
    if (!file || storeId === null) return;
    setIsWorking(true);
    setErrorMessage(undefined);
    const result = await uploadApiFile<StockCountFilePreviewResponse>(`${ApiEndpoints.inventory.nonZeroStock.countFilePreview}?storeId=${encodeURIComponent(storeId)}`, file, "POST");
    setIsWorking(false);
    if (fileInputReference.current) fileInputReference.current.value = "";
    if (!result.ok) return setErrorMessage(result.problem.message);
    setCounts((current) => ({ ...current, ...Object.fromEntries(result.data.rows.map((row) => [row.variantId, formatQuantity(row.countedQuantity)])) }));
    setProblems(result.data.problems);
    showToast(translateMessage("inventory.nonZero.fileRead", { count: result.data.rows.length }), ToneNames.info);
  }

  async function handleUpdate() {
    if (storeId === null) return;
    setErrorMessage(undefined);
    if (enteredCounts.length === 0) return setErrorMessage(translateMessage("inventory.nonZero.problem.nothingEntered"));
    if (!isValidIsoDate(updateDate)) return setErrorMessage(translateMessage("fields.invalidDate"));
    setIsWorking(true);
    const request: CreateStockCountUpdateRequest = {
      storeId,
      updateDate,
      clientTransactionId: transactionIdReference.current,
      description: description.trim() === "" ? null : description.trim(),
      lines: enteredCounts,
    };
    const result = await apiRequest<StockAdjustmentResponse>(ApiEndpoints.inventory.nonZeroStock.countUpdates, {
      method: "POST",
      body: request,
      idempotencyKey: transactionIdReference.current,
    });
    setIsWorking(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    showToast(translateMessage("inventory.nonZero.updated", { number: result.data.documentNumber, count: result.data.lines.length }), ToneNames.success);
    setCounts({});
    setProblems([]);
    setGridVersion((version) => version + 1);
    transactionIdReference.current = createClientTransactionId();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.nonZero.title")} subtitle={translateMessage("inventory.nonZero.subtitle", { store: storeName })} />
      {storeId === null ? (
        <ChooseStoreNotice />
      ) : (
        <>
          {mayUpdate && (
            <SectionCard>
              <div className="grid gap-4 sm:grid-cols-3">
                <DateField label={translateMessage("inventory.common.date")} name="countUpdateDate" value={updateDate} onValueChange={setUpdateDate} maximumIsoDate={todayAsIsoDate()} isRequired />
                <div className="sm:col-span-2">
                  <TextInputField label={translateMessage("inventory.common.description")} name="countUpdateDescription" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
                </div>
              </div>
            </SectionCard>
          )}
          <FormResultNotice errorMessage={errorMessage} />
          {problems.length > 0 && (
            <InlineNotice tone={ToneNames.warning}>
              <span className="block font-medium">{translateMessage("inventory.nonZero.fileProblems", { count: problems.length })}</span>
              {problems.slice(0, MAXIMUM_PROBLEMS_SHOWN).map((problem) => (
                <span key={`${problem.rowNumber}-${problem.barcode}`} className="block">
                  {translateMessage("inventory.nonZero.fileProblemRow", { row: problem.rowNumber, barcode: problem.barcode, message: problem.message })}
                </span>
              ))}
            </InlineNotice>
          )}
          <SectionCard isPadded={false}>
            <ServerPaginatedDataGrid<NonZeroStockRowResponse>
              key={`${storeId}-${gridVersion}`}
              path={ApiEndpoints.inventory.nonZeroStock.list}
              filters={{ storeId }}
              columns={columns}
              getRowKey={(row) => row.variantId}
              caption={translateMessage("inventory.nonZero.caption")}
              emptyTitle={translateMessage("inventory.nonZero.empty")}
              searchPlaceholder={translateMessage("inventory.nonZero.search")}
              toolbarActions={
                <>
                  {mayExport && (
                    <ExportCsvButton
                      fileName="non-zero-stock.csv"
                      loadTable={async () => {
                        const result = await fetchAllPagesOfList<NonZeroStockRowResponse>(ApiEndpoints.inventory.nonZeroStock.list, { storeId });
                        if (!result.ok) return { errorMessage: result.problem.message };
                        return {
                          headers: ["Barcode", "Product", "Size", "Purchase price", "Stock", "Count"],
                          rows: result.rows.map((row) => [row.barcode, row.productName, row.sizeCode, row.purchasePriceAmount, row.stockQuantity, ""]),
                        };
                      }}
                    />
                  )}
                  {mayUpdate && (
                    <>
                      <input ref={fileInputReference} type="file" accept=".xlsx,.csv" className="hidden" onChange={(event) => handleFileChosen(event.target.files?.[0])} aria-label={translateMessage("inventory.nonZero.chooseFile")} />
                      <Button type="button" variant="outline" disabled={isWorking} onClick={() => fileInputReference.current?.click()}>
                        <Upload />
                        {translateMessage("inventory.nonZero.importFile")}
                      </Button>
                      <Button type="button" disabled={isWorking || enteredCounts.length === 0} onClick={handleUpdate}>
                        {translateMessage("inventory.nonZero.update", { count: enteredCounts.length })}
                      </Button>
                    </>
                  )}
                </>
              }
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
