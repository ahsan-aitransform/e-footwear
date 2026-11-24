"use client";

import { useMemo, useRef, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect } from "@/components/forms/OptionSelect";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { ChooseStoreNotice } from "../components/ChooseStoreNotice";
import { TransferWorkModes, TransferWorkPanel } from "../components/TransferWorkPanel";
import { useInventoryWorkingStore } from "../hooks/useInventoryWorkingStore";
import { buildStockTransferColumns } from "../logic/stockTransferColumns";
import { TransferDirectionCodes, type CreateStockTransferRequest, type InventoryStoreResponse, type StockTransferListItemResponse, type StockTransferResponse } from "../types/inventoryTypes";

// Stock Transfer (docx 5.9, Part 19): the working store sends pieces to another store. A transfer starts as a draft; the pieces are added by scanning them, then the
// transfer is sent (they leave this store's stock and are in transit until the receiving store completes it). A draft that is not wanted can be cancelled.
export function StockTransferPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const { storeId, storeName } = useInventoryWorkingStore();
  const transactionIdReference = useRef(createClientTransactionId());
  const [toStoreId, setToStoreId] = useState("");
  const [note, setNote] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [selectedTransferId, setSelectedTransferId] = useState<string>();
  const [gridVersion, setGridVersion] = useState(0);
  const stores = useApiQuery<InventoryStoreResponse[]>(ApiEndpoints.inventory.stockTransfers.stores);
  const mayCreate = hasPermission(PermissionCodes.INVOICE.STOCK_TRANSFER.ADD) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.TRANSFER_CREATE);

  const destinationOptions = useMemo(
    () => (stores.data ?? []).filter((store) => store.id !== storeId).map((store) => ({ value: store.id, label: store.name })),
    [storeId, stores.data],
  );
  const columns = useMemo(() => buildStockTransferColumns(translateMessage, { showOtherStore: "to" }), [translateMessage]);

  async function handleCreate() {
    if (storeId === null) return;
    setErrorMessage(undefined);
    if (toStoreId === "") return setErrorMessage(translateMessage("inventory.transfer.problem.chooseStore"));
    setIsCreating(true);
    const request: CreateStockTransferRequest = { fromStoreId: storeId, toStoreId, clientTransactionId: transactionIdReference.current, note: note.trim() === "" ? null : note.trim() };
    const result = await apiRequest<StockTransferResponse>(ApiEndpoints.inventory.stockTransfers.list, { method: "POST", body: request, idempotencyKey: transactionIdReference.current });
    setIsCreating(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    transactionIdReference.current = createClientTransactionId();
    showToast(translateMessage("inventory.transfer.created", { number: result.data.transferNumber }), ToneNames.success);
    setNote("");
    setToStoreId("");
    setGridVersion((version) => version + 1);
    setSelectedTransferId(result.data.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.transfer.title")} subtitle={translateMessage("inventory.transfer.subtitle", { store: storeName })} />
      {storeId === null ? (
        <ChooseStoreNotice />
      ) : (
        <>
          {mayCreate && (
            <SectionCard title={translateMessage("inventory.transfer.new.title")} description={translateMessage("inventory.transfer.new.text")}>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label={translateMessage("inventory.transfer.column.toStore")} name="transferToStore" isRequired>
                  {(controlProps) => (
                    <OptionSelect {...controlProps} options={destinationOptions} value={toStoreId} onValueChange={setToStoreId} emptyOptionLabel={translateMessage("inventory.transfer.chooseStore")} />
                  )}
                </FormField>
                <TextInputField label={translateMessage("inventory.common.description")} name="transferNote" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
                <div className="flex items-end">
                  <Button type="button" onClick={handleCreate} disabled={isCreating}>
                    {translateMessage("inventory.transfer.new.button")}
                  </Button>
                </div>
              </div>
              <FormResultNotice errorMessage={errorMessage} />
            </SectionCard>
          )}
          {selectedTransferId && (
            <TransferWorkPanel
              key={selectedTransferId}
              transferId={selectedTransferId}
              mode={TransferWorkModes.send}
              onChanged={() => setGridVersion((version) => version + 1)}
              onClosed={() => setSelectedTransferId(undefined)}
            />
          )}
          <SectionCard title={translateMessage("inventory.transfer.list.title")} isPadded={false}>
            <ServerPaginatedDataGrid<StockTransferListItemResponse>
              key={`${storeId}-${gridVersion}`}
              path={ApiEndpoints.inventory.stockTransfers.list}
              filters={{ storeId, directionCode: TransferDirectionCodes.outgoing }}
              columns={columns}
              getRowKey={(transfer) => transfer.id}
              caption={translateMessage("inventory.transfer.list.caption")}
              emptyTitle={translateMessage("inventory.transfer.list.empty")}
              isSearchEnabled={false}
              onRowOpen={(transfer) => setSelectedTransferId(transfer.id)}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
