"use client";

import { useMemo, useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { ReportStoreSelect } from "@/features/accounting/components/ReportStoreSelect";
import type { StockReconciliationResponse } from "../types/inventoryTypes";

type Mismatch = StockReconciliationResponse["mismatches"][number];

// Stock Reconciliation: does the stock balance of every size equal the sum of its stock ledger? It only reports. A mismatch is never corrected here: it is shown with
// the store, the size and the difference so that it can be investigated. Also shown: the pieces in transit between stores, the missing pieces still waiting for a
// decision, and the value of the stock in the books.
export function StockReconciliationPage() {
  const { translateMessage } = useTranslation();
  const [storeId, setStoreId] = useState("");
  const reconciliation = useApiQuery<StockReconciliationResponse>(ApiEndpoints.inventory.stockReconciliation, { query: { storeId: storeId || undefined } });
  const result = reconciliation.data;

  const columns = useMemo<DataGridColumn<Mismatch>[]>(
    () => [
      { key: "store", header: translateMessage("inventory.common.store"), render: (row) => row.storeName },
      { key: "barcode", header: translateMessage("inventory.column.barcode"), render: (row) => <span dir="ltr">{row.barcode}</span> },
      { key: "product", header: translateMessage("inventory.column.product"), render: (row) => `${row.productName} (${row.sizeCode})` },
      { key: "balance", header: translateMessage("inventory.reconciliation.balance"), alignment: "end", render: (row) => formatQuantity(row.balanceQuantity) },
      { key: "ledger", header: translateMessage("inventory.reconciliation.ledger"), alignment: "end", render: (row) => formatQuantity(row.ledgerQuantity) },
      { key: "difference", header: translateMessage("inventory.audit.difference"), alignment: "end", render: (row) => formatQuantity(row.differenceQuantity) },
    ],
    [translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("inventory.reconciliation.title")}
        subtitle={translateMessage("inventory.reconciliation.subtitle")}
        actions={
          <Button type="button" variant="outline" onClick={() => reconciliation.refetch()} disabled={reconciliation.isRefreshing}>
            {translateMessage("inventory.reconciliation.check")}
          </Button>
        }
      />
      <SectionCard>
        <div className="sm:w-72">
          <ReportStoreSelect name="reconciliationStore" storeId={storeId} onStoreIdChange={setStoreId} />
        </div>
      </SectionCard>
      {reconciliation.status === "loading" && !result && <LoadingIndicator />}
      {reconciliation.status === "error" && <InlineNotice>{reconciliation.problem?.message ?? translateMessage("inventory.reconciliation.failed")}</InlineNotice>}
      {result && (
        <>
          <InlineNotice tone={result.isClean ? ToneNames.success : ToneNames.danger}>
            {result.isClean ? translateMessage("inventory.reconciliation.clean", { count: result.checkedSizeCount }) : translateMessage("inventory.reconciliation.notClean", { count: result.mismatches.length })}
          </InlineNotice>
          <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-card p-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">{translateMessage("inventory.reconciliation.stockValue")}</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatWholeRupees(result.stockValueAmount)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{translateMessage("inventory.reconciliation.inTransit")}</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {formatQuantity(result.piecesInTransitQuantity)} <span className="text-sm font-normal text-muted-foreground">({translateMessage("inventory.reconciliation.transfers", { count: result.transfersInTransitCount })})</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{translateMessage("inventory.reconciliation.openLosses")}</dt>
              <dd className="text-lg font-semibold tabular-nums">{result.openLossCaseCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{translateMessage("inventory.reconciliation.negative")}</dt>
              <dd className="text-lg font-semibold tabular-nums">{result.negativeBalanceCount}</dd>
            </div>
          </dl>
          <SectionCard title={translateMessage("inventory.reconciliation.mismatches")} isPadded={false}>
            <DataGridTable
              rows={result.mismatches}
              columns={columns}
              getRowKey={(row) => `${row.storeId}-${row.variantId}`}
              caption={translateMessage("inventory.reconciliation.mismatches")}
              emptyTitle={translateMessage("inventory.reconciliation.noMismatches")}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
