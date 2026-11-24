"use client";

import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ChooseStoreNotice } from "../components/ChooseStoreNotice";
import { TransferWorkModes, TransferWorkPanel } from "../components/TransferWorkPanel";
import { useInventoryWorkingStore } from "../hooks/useInventoryWorkingStore";
import { buildStockTransferColumns } from "../logic/stockTransferColumns";
import { StockTransferStatusCodes, type StockTransferListItemResponse } from "../types/inventoryTypes";

// Stock Transfer Receiving (Part 19): the transfers on their way to the working store. Open one, scan every piece that arrives, then complete the receiving. The pieces
// scanned go into this store's stock; pieces not scanned are raised as missing and wait for a decision (Transfer Discrepancies). Scanning does not change stock until then.
export function StockTransferReceivingPage() {
  const { translateMessage } = useTranslation();
  const { storeId, storeName } = useInventoryWorkingStore();
  const [statusCode, setStatusCode] = useState<string>(StockTransferStatusCodes.shipped);
  const [selectedTransferId, setSelectedTransferId] = useState<string>();
  const [gridVersion, setGridVersion] = useState(0);
  const columns = useMemo(() => buildStockTransferColumns(translateMessage, { showOtherStore: "from" }), [translateMessage]);

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.receiving.title")} subtitle={translateMessage("inventory.receiving.subtitle", { store: storeName })} />
      {storeId === null ? (
        <ChooseStoreNotice />
      ) : (
        <>
          {selectedTransferId && (
            <TransferWorkPanel
              key={selectedTransferId}
              transferId={selectedTransferId}
              mode={TransferWorkModes.receive}
              onChanged={() => setGridVersion((version) => version + 1)}
              onClosed={() => setSelectedTransferId(undefined)}
            />
          )}
          <SectionCard isPadded={false}>
            <div className="border-b p-4 sm:w-72">
              <FormField label={translateMessage("inventory.detail.status")} name="receivingStatus">
                {(controlProps) => (
                  <NativeSelect {...controlProps} value={statusCode} onChange={(event) => setStatusCode(event.target.value)}>
                    <option value="">{translateMessage("inventory.common.allStatuses")}</option>
                    <option value={StockTransferStatusCodes.shipped}>{translateMessage("inventory.status.shipped")}</option>
                    <option value={StockTransferStatusCodes.receiving}>{translateMessage("inventory.status.receiving")}</option>
                    <option value={StockTransferStatusCodes.completed}>{translateMessage("inventory.status.completed")}</option>
                    <option value={StockTransferStatusCodes.completedWithMissing}>{translateMessage("inventory.status.completedWithMissing")}</option>
                  </NativeSelect>
                )}
              </FormField>
            </div>
            <ServerPaginatedDataGrid<StockTransferListItemResponse>
              key={`${storeId}-${statusCode}-${gridVersion}`}
              path={ApiEndpoints.inventory.stockTransferReceiving.list}
              filters={{ storeId, statusCode: statusCode || undefined }}
              columns={columns}
              getRowKey={(transfer) => transfer.id}
              caption={translateMessage("inventory.receiving.caption")}
              emptyTitle={translateMessage("inventory.receiving.empty")}
              isSearchEnabled={false}
              onRowOpen={(transfer) => setSelectedTransferId(transfer.id)}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
