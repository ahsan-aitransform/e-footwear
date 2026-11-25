"use client";

import { useMemo, useRef, useState } from "react";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { PercentageField } from "@/components/forms/PercentageField";
import { QuantityField } from "@/components/forms/QuantityField";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { useWorkingStoreId } from "@/lib/session/useWorkingStoreId";
import { apiRequest } from "@/lib/api/apiRequest";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatPercentage, formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { PostPreviewGrid } from "../components/PostPreviewGrid";
import { useCatalogueLookups } from "../hooks/useCatalogueLookups";
import { validateDiscountPercentage, validateStockRange } from "../logic/priceChangeValidation";
import type { ProductDiscountAppliedResponse, StockRangeDiscountRequest, StockRangeDiscountRowResponse } from "../types/catalogueTypes";

// Change Discounts (docx 4.9): give a discount to every product of one store whose stock is between a minimum and a maximum,
// optionally for one brand (slow movers on sale). The table lists the products that match with the discount they would get;
// applying creates one discount rule per store that the till prices from. Overlapping rules are reported as conflicts.
export function ChangeDiscountsPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const workingStoreId = useWorkingStoreId();
  const lookups = useCatalogueLookups();
  const mayApply = hasPermission(PermissionCodes.PRODUCTS.CHANGE_DISCOUNTS.EDIT);

  const [storeId, setStoreId] = useState<string | null>(workingStoreId);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [minimumStock, setMinimumStock] = useState<number | null>(null);
  const [maximumStock, setMaximumStock] = useState<number | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [resultMessage, setResultMessage] = useState<string>();
  const transactionIdReference = useRef<string | null>(null);

  const stockRangeProblem = validateStockRange(minimumStock, maximumStock);
  const discountProblem = validateDiscountPercentage(discountPercent);
  const isComplete = storeId !== null && stockRangeProblem === null && discountProblem === null;
  const hasStartedTyping = minimumStock !== null || maximumStock !== null || discountPercent !== null;

  function buildRequest(clientTransactionId: string): StockRangeDiscountRequest {
    return { storeId: storeId ?? "", brandId, minimumStock: minimumStock ?? 0, maximumStock: maximumStock ?? 0, discountPercent: discountPercent ?? 0, clientTransactionId };
  }

  const previewBody = useMemo(
    () => (isComplete ? buildRequest("00000000-0000-0000-0000-000000000000") : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isComplete, storeId, brandId, minimumStock, maximumStock, discountPercent],
  );

  function change<TValue>(setter: (value: TValue) => void) {
    return (value: TValue) => {
      transactionIdReference.current = null;
      setResultMessage(undefined);
      setter(value);
    };
  }

  async function apply() {
    transactionIdReference.current ??= createClientTransactionId();
    const body = buildRequest(transactionIdReference.current);
    setIsApplying(true);
    setErrorMessage(undefined);
    const result = await apiRequest<ProductDiscountAppliedResponse>(ApiEndpoints.productDiscounts.stockRange, { method: "POST", body, idempotencyKey: body.clientTransactionId });
    setIsApplying(false);
    setIsConfirming(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    transactionIdReference.current = null;
    setResultMessage(
      translateMessage("catalogue.result.discountApplied", { count: result.data.affectedProductCount }) +
        (result.data.conflictingVariantCount > 0 ? ` ${translateMessage("catalogue.result.conflicts", { count: result.data.conflictingVariantCount })}` : ""),
    );
    showToast(translateMessage("catalogue.toast.discountApplied"), ToneNames.success);
    setRefreshCounter((counter) => counter + 1);
  }

  const columns = useMemo<DataGridColumn<StockRangeDiscountRowResponse>[]>(
    () => [
      { key: "productCode", header: translateMessage("catalogue.field.productCode"), render: (row) => <span dir="ltr">{row.productCode}</span> },
      { key: "productName", header: translateMessage("catalogue.field.productName"), render: (row) => row.productName },
      { key: "brandName", header: translateMessage("catalogue.field.brand"), isSecondary: true, render: (row) => row.brandName ?? "" },
      { key: "genderName", header: translateMessage("catalogue.field.gender"), isSecondary: true, render: (row) => row.genderName ?? "" },
      { key: "seasonName", header: translateMessage("catalogue.field.season"), isSecondary: true, render: (row) => row.seasonName ?? "" },
      { key: "locationName", header: translateMessage("catalogue.field.location"), isSecondary: true, render: (row) => row.locationName ?? "" },
      { key: "stockQuantity", header: translateMessage("catalogue.field.stock"), alignment: "end", render: (row) => formatQuantity(row.stockQuantity) },
      { key: "salePrice", header: translateMessage("catalogue.field.salePrice"), alignment: "end", render: (row) => formatWholeRupees(row.salePrice, { withSymbol: false }) },
      { key: "discountPercent", header: translateMessage("catalogue.field.discountPercent"), alignment: "end", render: (row) => (row.discountPercent === null ? "" : formatPercentage(row.discountPercent)) },
      { key: "discountAmount", header: translateMessage("catalogue.field.discountAmount"), alignment: "end", render: (row) => formatWholeRupees(row.discountAmount, { withSymbol: false }) },
    ],
    [translateMessage],
  );

  const problemKey = !isComplete && hasStartedTyping ? (stockRangeProblem ?? discountProblem) : null;

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.changeDiscounts")} subtitle={translateMessage("catalogue.changeDiscounts.subtitle")} />
      <SectionCard>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <FormField label={translateMessage("catalogue.filter.store")} name="catalogueChangeDiscountsStore" isRequired>
            {(controlProps) => <SearchableSelect {...controlProps} options={lookups.storeOptions} value={storeId} onValueChange={change(setStoreId)} />}
          </FormField>
          <FormField label={translateMessage("catalogue.filter.brand")} name="catalogueChangeDiscountsBrand">
            {(controlProps) => <SearchableSelect {...controlProps} options={lookups.brandOptions} value={brandId} isClearable placeholder={translateMessage("catalogue.filter.all")} onValueChange={change(setBrandId)} />}
          </FormField>
          <QuantityField label={translateMessage("catalogue.changeDiscounts.minimumStock")} name="catalogueMinimumStock" value={minimumStock} onValueChange={change(setMinimumStock)} isRequired />
          <QuantityField label={translateMessage("catalogue.changeDiscounts.maximumStock")} name="catalogueMaximumStock" value={maximumStock} onValueChange={change(setMaximumStock)} isRequired />
          <PercentageField label={translateMessage("catalogue.field.discountPercent")} name="catalogueDiscountPercent" value={discountPercent} onValueChange={change(setDiscountPercent)} isRequired />
        </div>
        {problemKey && (
          <div className="mt-4">
            <InlineNotice tone={ToneNames.warning}>{translateMessage(problemKey)}</InlineNotice>
          </div>
        )}
      </SectionCard>
      <FormResultNotice errorMessage={errorMessage} successMessage={resultMessage} />
      <SectionCard
        title={translateMessage("catalogue.changeDiscounts.previewTitle")}
        isPadded={false}
        action={
          mayApply && (
            <Button type="button" disabled={previewBody === null || isApplying} onClick={() => setIsConfirming(true)}>
              {translateMessage("catalogue.action.apply")}
            </Button>
          )
        }
      >
        <PostPreviewGrid<StockRangeDiscountRowResponse>
          path={ApiEndpoints.productDiscounts.stockRangePreview}
          body={previewBody}
          columns={columns}
          getRowKey={(row) => row.productId}
          caption={translateMessage("catalogue.changeDiscounts.previewTitle")}
          emptyTitle={translateMessage("catalogue.changeDiscounts.noRows")}
          emptyText={translateMessage("catalogue.changeDiscounts.noRowsText")}
          idleText={translateMessage("catalogue.changeDiscounts.fillIn")}
          refreshKey={refreshCounter}
        />
      </SectionCard>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        onConfirm={apply}
        isPending={isApplying}
        isDestructive={false}
        titleMessageKey="catalogue.changeDiscounts.confirmTitle"
        descriptionMessageKey="catalogue.changeDiscounts.confirmText"
        confirmLabelMessageKey="catalogue.action.apply"
      />
    </div>
  );
}
