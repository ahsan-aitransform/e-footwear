"use client";

import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { ChooseStoreNotice } from "../components/ChooseStoreNotice";
import { InventoryItemPicker } from "../components/InventoryItemPicker";
import { useInventoryWorkingStore } from "../hooks/useInventoryWorkingStore";
import { buildMultiTransferRequest, findMultiTransferProblem, MAXIMUM_DESTINATIONS_PER_MULTI_TRANSFER, type MultiTransferMatrix, type MultiTransferMatrixItem } from "../logic/multiTransferRequest";
import type { CreateMultiStockTransferResponse, InventoryItemResponse, InventoryStoreResponse } from "../types/inventoryTypes";

// Stock Transfer Multi (docx 5.10): send pieces of several items to several stores at once. Choose the receiving stores, add the items, type the quantity each store gets.
// Every receiving store becomes its own transfer (and can be received separately); with "Send at once" they are all sent in the same step. If any line cannot be sent
// nothing at all is saved. Pressing Save again after a lost answer sends the same transaction ids, so nothing is created twice.
export function StockTransferMultiPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const { storeId, storeName } = useInventoryWorkingStore();
  const transactionIdsReference = useRef<Record<string, string>>({});
  const [items, setItems] = useState<MultiTransferMatrixItem[]>([]);
  const [cellText, setCellText] = useState<Record<string, Record<string, string>>>({});
  const [destinationStoreIds, setDestinationStoreIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [shouldDispatch, setShouldDispatch] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const stores = useApiQuery<InventoryStoreResponse[]>(ApiEndpoints.inventory.stockTransfers.stores);
  const mayCreate = hasPermission(PermissionCodes.INVOICE.STOCK_TRANSFER_MULTI.ADD) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.TRANSFER_CREATE);
  const destinationStores = (stores.data ?? []).filter((store) => store.id !== storeId);

  function addItem(item: InventoryItemResponse) {
    setItems((current) =>
      current.some((candidate) => candidate.variantId === item.variantId)
        ? current
        : [...current, { variantId: item.variantId, barcode: item.barcode, productName: item.productName, sizeCode: item.sizeCode, stockQuantity: item.stockQuantity }],
    );
  }

  function toggleDestination(destinationStoreId: string, isChosen: boolean) {
    setDestinationStoreIds((current) => (isChosen ? [...current, destinationStoreId] : current.filter((id) => id !== destinationStoreId)));
  }

  function transactionIdForStore(destinationStoreId: string): string {
    transactionIdsReference.current[destinationStoreId] ??= createClientTransactionId();
    return transactionIdsReference.current[destinationStoreId];
  }

  function reset() {
    setItems([]);
    setCellText({});
    setDestinationStoreIds([]);
    setNote("");
    setErrorMessage(undefined);
    transactionIdsReference.current = {};
  }

  async function handleSave() {
    if (storeId === null) return;
    setErrorMessage(undefined);
    const matrix: MultiTransferMatrix = { items, cellText, destinationStoreIds };
    if (destinationStoreIds.length === 0) return setErrorMessage(translateMessage("inventory.multi.problem.noStores"));
    const problem = findMultiTransferProblem(matrix);
    if (problem) {
      const parameters = { product: problem.productName ?? "", maximum: MAXIMUM_DESTINATIONS_PER_MULTI_TRANSFER };
      return setErrorMessage(translateMessage(`inventory.multi.problem.${problem.kind}`, parameters));
    }
    setIsSaving(true);
    const request = buildMultiTransferRequest(matrix, storeId, note.trim() === "" ? null : note.trim(), shouldDispatch, transactionIdForStore);
    const result = await apiRequest<CreateMultiStockTransferResponse>(ApiEndpoints.inventory.stockTransfers.multi, { method: "POST", body: request });
    setIsSaving(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    showToast(translateMessage("inventory.multi.saved", { count: result.data.transfers.length }), ToneNames.success);
    reset();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.multi.title")} subtitle={translateMessage("inventory.multi.subtitle", { store: storeName })} />
      {storeId === null ? (
        <ChooseStoreNotice />
      ) : !mayCreate ? (
        <FormResultNotice errorMessage={translateMessage("inventory.multi.noPermission")} />
      ) : (
        <>
          <SectionCard title={translateMessage("inventory.multi.stores.title")} description={translateMessage("inventory.multi.stores.text", { maximum: MAXIMUM_DESTINATIONS_PER_MULTI_TRANSFER })}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {destinationStores.map((store) => (
                <div key={store.id} className="flex items-center gap-2">
                  <Checkbox id={`multi-store-${store.id}`} checked={destinationStoreIds.includes(store.id)} onCheckedChange={(checked) => toggleDestination(store.id, checked === true)} />
                  <Label htmlFor={`multi-store-${store.id}`}>{store.name}</Label>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title={translateMessage("inventory.multi.items.title")}>
            <div className="space-y-4">
              <InventoryItemPicker
                storeId={storeId}
                barcodePath={ApiEndpoints.inventory.stockTransfers.itemByBarcode}
                searchPath={ApiEndpoints.inventory.stockTransfers.itemSearch}
                onItemChosen={addItem}
                isDisabled={isSaving}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translateMessage("inventory.column.barcode")}</TableHead>
                    <TableHead>{translateMessage("inventory.column.product")}</TableHead>
                    <TableHead>{translateMessage("inventory.column.size")}</TableHead>
                    <TableHead className="text-end">{translateMessage("inventory.column.inStock")}</TableHead>
                    {destinationStoreIds.map((destinationStoreId) => (
                      <TableHead key={destinationStoreId} className="w-28 text-end">
                        {destinationStores.find((store) => store.id === destinationStoreId)?.name}
                      </TableHead>
                    ))}
                    <TableHead className="w-10">
                      <span className="sr-only">{translateMessage("inventory.common.remove")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5 + destinationStoreIds.length} className="py-8 text-center text-muted-foreground">
                        {translateMessage("inventory.multi.empty")}
                      </TableCell>
                    </TableRow>
                  )}
                  {items.map((item) => (
                    <TableRow key={item.variantId}>
                      <TableCell dir="ltr" className="text-start">{item.barcode}</TableCell>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.sizeCode}</TableCell>
                      <TableCell className="text-end tabular-nums">{formatQuantity(item.stockQuantity)}</TableCell>
                      {destinationStoreIds.map((destinationStoreId) => (
                        <TableCell key={destinationStoreId}>
                          <Input
                            aria-label={translateMessage("inventory.multi.cellFor", { product: item.productName, store: destinationStores.find((store) => store.id === destinationStoreId)?.name ?? "" })}
                            inputMode="numeric"
                            dir="ltr"
                            className="text-end"
                            value={cellText[item.variantId]?.[destinationStoreId] ?? ""}
                            onChange={(event) =>
                              setCellText((current) => ({ ...current, [item.variantId]: { ...current[item.variantId], [destinationStoreId]: event.target.value } }))
                            }
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" aria-label={translateMessage("inventory.common.remove")} onClick={() => setItems((current) => current.filter((candidate) => candidate.variantId !== item.variantId))}>
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TextInputField label={translateMessage("inventory.common.description")} name="multiTransferNote" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
              <div className="flex items-center gap-2">
                <Checkbox id="multi-dispatch" checked={shouldDispatch} onCheckedChange={(checked) => setShouldDispatch(checked === true)} />
                <Label htmlFor="multi-dispatch">{translateMessage("inventory.multi.sendAtOnce")}</Label>
              </div>
              <FormResultNotice errorMessage={errorMessage} />
              <div className="flex gap-2">
                <Button type="button" onClick={handleSave} disabled={isSaving}>
                  {translateMessage("inventory.common.save")}
                </Button>
                <Button type="button" variant="outline" onClick={reset} disabled={isSaving}>
                  {translateMessage("inventory.common.reset")}
                </Button>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
