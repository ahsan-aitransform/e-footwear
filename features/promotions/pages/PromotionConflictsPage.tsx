"use client";

import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { StoreFilterSelect } from "@/features/payroll/components/StoreFilterSelect";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { showToast } from "@/lib/toast/toastStore";
import type { PromotionConflictResponse, ResolvePromotionConflictRequest } from "../types/promotionTypes";

const money = (amount: number) => formatWholeRupees(amount, { withSymbol: false });

// Promotion Conflicts (Part 18): products that two or more promotions cover in the same store are sold at the normal price until somebody chooses the promotion that wins.
// Each row lists the promotions that cover the product with the price each would give; "Use this one" chooses it. The choice is kept while the same promotions cover the product;
// a new or changed promotion opens the question again. Nothing is combined and nothing is chosen for the person.
export function PromotionConflictsPage() {
  const { translateMessage } = useTranslation();
  const [storeId, setStoreId] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [message, setMessage] = useState<string>();
  const filters = useMemo(() => ({ storeId, refresh: refreshCounter }), [storeId, refreshCounter]);

  async function choose(conflict: PromotionConflictResponse, ruleId: string) {
    setMessage(undefined);
    const body: ResolvePromotionConflictRequest = { chosenRuleId: ruleId };
    const result = await apiRequest<void>(ApiEndpoints.promotions.resolveConflict(conflict.groupId), { method: "POST", body });
    if (!result.ok) return setMessage(result.problem.message || translateMessage("promotions.conflicts.error"));
    showToast(translateMessage("promotions.conflicts.toast.resolved"), ToneNames.success);
    setRefreshCounter((counter) => counter + 1);
  }

  const columns = useMemo<DataGridColumn<PromotionConflictResponse>[]>(
    () => [
      { key: "productName", header: translateMessage("promotions.conflicts.column.product"), isSortable: false, render: (conflict) => `${conflict.productName} (${conflict.sizeCode}) ${conflict.barcode}` },
      { key: "storeName", header: translateMessage("promotions.conflicts.column.store"), isSecondary: true, render: (conflict) => conflict.storeName },
      { key: "listPrice", header: translateMessage("promotions.conflicts.column.listPrice"), alignment: "end", render: (conflict) => <span dir="ltr">{money(conflict.listPrice)}</span> },
      {
        key: "candidates",
        header: translateMessage("promotions.conflicts.column.choices"),
        render: (conflict) => (
          <ul className="space-y-2">
            {conflict.candidates.map((candidate) => (
              <li key={candidate.ruleId} className="flex flex-wrap items-center gap-2">
                <span>
                  {translateMessage("promotions.conflicts.choice", {
                    name: candidate.ruleName,
                    kind: translateMessage(`promotions.kind.${candidate.kindCode as "SPECIAL_OFFER" | "SALE_ON_STORES" | "SALE_ON_CATEGORIES" | "PROMOTION" | "PRODUCT_DISCOUNT"}`),
                    price: money(candidate.salePrice),
                  })}
                </span>
                <PermissionGate requirement={requireAnyPermission(PermissionCodes.PROMOTIONS.PROMOTION_CONFLICT_RESOLUTION.APPROVE)}>
                  <Button type="button" size="sm" variant="outline" onClick={() => void choose(conflict, candidate.ruleId)}>
                    {translateMessage("promotions.conflicts.use")}
                  </Button>
                </PermissionGate>
              </li>
            ))}
          </ul>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("promotions.conflicts.title")} subtitle={translateMessage("promotions.conflicts.subtitle")} />
      <SectionCard>
        <div className="grid items-end gap-4 sm:grid-cols-3">
          <StoreFilterSelect name="promotion-conflicts-store" label={translateMessage("promotions.conflicts.store")} allStoresLabel={translateMessage("promotions.conflicts.allStores")} storeId={storeId} onStoreIdChange={setStoreId} />
        </div>
      </SectionCard>
      <FormResultNotice errorMessage={message} />
      <SectionCard isPadded={false}>
        <ServerPaginatedDataGrid<PromotionConflictResponse>
          path={ApiEndpoints.promotions.conflicts}
          columns={columns}
          getRowKey={(conflict) => conflict.groupId}
          caption={translateMessage("promotions.conflicts.title")}
          emptyTitle={translateMessage("promotions.conflicts.empty")}
          emptyText={translateMessage("promotions.conflicts.emptyText")}
          isSearchEnabled={false}
          filters={filters}
        />
      </SectionCard>
    </div>
  );
}
