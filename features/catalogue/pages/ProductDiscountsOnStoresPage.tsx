"use client";

import { useMemo, useRef, useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { PercentageField } from "@/components/forms/PercentageField";
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
import { formatPercentage, formatQuantity } from "@/lib/money/quantityAndPercentage";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { ProductPicker, type PickedProduct } from "../components/ProductPicker";
import { validateDiscountPercentage } from "../logic/priceChangeValidation";
import type { ProductDiscountAppliedResponse, ProductDiscountOnStoresRequest, ProductStoreDiscountRowResponse } from "../types/catalogueTypes";

// Product Discounts on Multiple Stores (docx 4.11): pick one product, see its stock and current discount in every store, tick the
// stores and give them one discount percentage. Each store gets its own discount rule, so stores can differ.
export function ProductDiscountsOnStoresPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const mayApply = hasPermission(PermissionCodes.PRODUCTS.PRODUCT_DISCOUNTS_ON_MULTIPLE_STORES.EDIT);
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [selectedStoreIds, setSelectedStoreIds] = useState<ReadonlySet<string>>(new Set());
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [resultMessage, setResultMessage] = useState<string>();
  const transactionIdReference = useRef<string | null>(null);

  const rows = useApiQuery<ProductStoreDiscountRowResponse[]>(ApiEndpoints.productDiscounts.storeRows, {
    query: { productId: product?.productId },
    enabled: product !== null,
  });

  const discountProblem = validateDiscountPercentage(discountPercent);
  const canApply = mayApply && product !== null && selectedStoreIds.size > 0 && discountProblem === null;

  function pickProduct(next: PickedProduct | null) {
    setProduct(next);
    setSelectedStoreIds(new Set());
    setResultMessage(undefined);
    transactionIdReference.current = null;
  }

  async function apply() {
    if (!product || discountPercent === null) return;
    transactionIdReference.current ??= createClientTransactionId();
    const body: ProductDiscountOnStoresRequest = { productId: product.productId, storeIds: [...selectedStoreIds], discountPercent, clientTransactionId: transactionIdReference.current };
    setIsApplying(true);
    setErrorMessage(undefined);
    const result = await apiRequest<ProductDiscountAppliedResponse>(ApiEndpoints.productDiscounts.onStores, { method: "POST", body, idempotencyKey: body.clientTransactionId });
    setIsApplying(false);
    setIsConfirming(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    transactionIdReference.current = null;
    setResultMessage(
      translateMessage("catalogue.result.discountOnStores", { stores: result.data.affectedStoreCount }) +
        (result.data.conflictingVariantCount > 0 ? ` ${translateMessage("catalogue.result.conflicts", { count: result.data.conflictingVariantCount })}` : ""),
    );
    showToast(translateMessage("catalogue.toast.discountApplied"), ToneNames.success);
    setSelectedStoreIds(new Set());
    rows.refetch();
  }

  const columns = useMemo<DataGridColumn<ProductStoreDiscountRowResponse>[]>(
    () => [
      { key: "storeName", header: translateMessage("catalogue.filter.store"), render: (row) => row.storeName },
      { key: "stockQuantity", header: translateMessage("catalogue.field.stock"), alignment: "end", render: (row) => formatQuantity(row.stockQuantity) },
      { key: "discountPercent", header: translateMessage("catalogue.productDiscountsOnStores.currentDiscount"), alignment: "end", render: (row) => (row.discountPercent === null ? translateMessage("common.notAvailable") : formatPercentage(row.discountPercent)) },
    ],
    [translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.productDiscountsOnMultipleStores")} subtitle={translateMessage("catalogue.productDiscountsOnStores.subtitle")} />
      <SectionCard>
        <div className="grid gap-4 md:grid-cols-2">
          <ProductPicker path={ApiEndpoints.products.lookupForDiscountsOnStores} label={translateMessage("catalogue.field.productName")} name="catalogueDiscountStoresProduct" picked={product} onPick={pickProduct} />
          <PercentageField label={translateMessage("catalogue.field.discountPercent")} name="catalogueDiscountStoresPercent" value={discountPercent} onValueChange={setDiscountPercent} isRequired />
        </div>
        {discountPercent !== null && discountProblem && (
          <div className="mt-4">
            <InlineNotice tone={ToneNames.warning}>{translateMessage(discountProblem)}</InlineNotice>
          </div>
        )}
      </SectionCard>
      <FormResultNotice errorMessage={errorMessage} successMessage={resultMessage} />
      <SectionCard
        title={translateMessage("catalogue.productDiscountsOnStores.storesTitle")}
        isPadded={false}
        action={
          mayApply && (
            <Button type="button" disabled={!canApply || isApplying} onClick={() => setIsConfirming(true)}>
              {translateMessage("catalogue.action.apply")}
            </Button>
          )
        }
      >
        {product === null ? (
          <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">{translateMessage("catalogue.productDiscountsOnStores.pickProduct")}</p>
        ) : (
          <DataGridTable
            rows={rows.data ?? []}
            columns={columns}
            getRowKey={(row) => row.storeId}
            caption={translateMessage("catalogue.productDiscountsOnStores.storesTitle")}
            isLoading={rows.status === "loading"}
            errorMessage={rows.status === "error" ? rows.problem?.message : undefined}
            emptyTitle={translateMessage("catalogue.productDiscountsOnStores.noStores")}
            selection={mayApply ? { selectedRowKeys: selectedStoreIds, onSelectedRowKeysChange: setSelectedStoreIds } : undefined}
          />
        )}
      </SectionCard>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        onConfirm={apply}
        isPending={isApplying}
        isDestructive={false}
        titleMessageKey="catalogue.productDiscountsOnStores.confirmTitle"
        descriptionMessageKey="catalogue.productDiscountsOnStores.confirmText"
        confirmLabelMessageKey="catalogue.action.apply"
      />
    </div>
  );
}
