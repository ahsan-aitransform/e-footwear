"use client";

import { useMemo, useRef, useState } from "react";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { PercentageField } from "@/components/forms/PercentageField";
import { QuantityField } from "@/components/forms/QuantityField";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/api/apiRequest";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatPercentage, formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { useWorkingStoreId } from "@/lib/session/useWorkingStoreId";
import { showToast } from "@/lib/toast/toastStore";
import { useCatalogueLookups } from "../hooks/useCatalogueLookups";
import { validateDiscountAmount, validateDiscountPercentage, validateStockRange } from "../logic/priceChangeValidation";
import {
  DiscountTypeCodes,
  type DiscountTypeCode,
  type ProductDiscountAppliedResponse,
  type ProductListFilterValues,
  type StockRangeDiscountRequest,
  type StockRangeDiscountRowResponse,
} from "../types/catalogueTypes";
import { CatalogueFilterFields } from "./CatalogueFilterFields";
import { PostPreviewGrid } from "./PostPreviewGrid";

// The discount part of Change Discounts (docx 4.9): a percentage or a fixed amount off the products of one store, chosen by department,
// categories, brands and an optional stock range. The table lists the matching products; applying creates one discount rule for the store
// that the till prices from. Overlapping rules are reported as conflicts.
export function ProductDiscountPanel() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const workingStoreId = useWorkingStoreId();
  const mayApply = hasPermission(PermissionCodes.PRODUCTS.CHANGE_DISCOUNTS.EDIT);

  const [storeId, setStoreId] = useState<string | null>(workingStoreId);
  const [filter, setFilter] = useState<ProductListFilterValues>({});
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [brandIds, setBrandIds] = useState<string[]>([]);
  const [minimumStock, setMinimumStock] = useState<number | null>(null);
  const [maximumStock, setMaximumStock] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<DiscountTypeCode>(DiscountTypeCodes.percent);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [resultMessage, setResultMessage] = useState<string>();
  const transactionIdReference = useRef<string | null>(null);
  const lookups = useCatalogueLookups(filter.departmentId);

  const isPercent = discountType === DiscountTypeCodes.percent;
  const discountValue = isPercent ? discountPercent : discountAmount;
  const stockRangeProblem = validateStockRange(minimumStock, maximumStock);
  const discountProblem = isPercent ? validateDiscountPercentage(discountPercent) : validateDiscountAmount(discountAmount);
  const canList = storeId !== null && stockRangeProblem === null;

  function buildRequest(clientTransactionId: string): StockRangeDiscountRequest {
    return { storeId: storeId ?? "", departmentId: filter.departmentId ?? null, categoryIds, brandIds, minimumStock, maximumStock, discountType, discountValue, clientTransactionId };
  }

  // The list does not depend on the discount: it shows the matching products as soon as a store is chosen.
  const previewBody = useMemo(
    () => (canList ? { ...buildRequest("00000000-0000-0000-0000-000000000000"), discountValue: null } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canList, storeId, filter.departmentId, categoryIds, brandIds, minimumStock, maximumStock],
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

  const problemKey = stockRangeProblem ?? (discountValue === null ? null : discountProblem);

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label={translateMessage("catalogue.filter.store")} name="catalogueChangeDiscountsStore" isRequired>
              {(controlProps) => <SearchableSelect {...controlProps} options={lookups.storeOptions} value={storeId} onValueChange={change(setStoreId)} />}
            </FormField>
            <QuantityField label={translateMessage("catalogue.changeDiscounts.minimumStock")} name="catalogueMinimumStock" value={minimumStock} onValueChange={change(setMinimumStock)} />
            <QuantityField label={translateMessage("catalogue.changeDiscounts.maximumStock")} name="catalogueMaximumStock" value={maximumStock} onValueChange={change(setMaximumStock)} />
          </div>
          <CatalogueFilterFields
            fields={["departmentId", "categoryId", "brandId"]}
            values={filter}
            onChange={change((next: ProductListFilterValues) => {
              // categories belong to one department
              if (next.departmentId !== filter.departmentId) setCategoryIds([]);
              setFilter(next);
            })}
            lookups={lookups}
            multipleSelections={{
              categoryId: { values: categoryIds, onValuesChange: change(setCategoryIds) },
              brandId: { values: brandIds, onValuesChange: change(setBrandIds) },
            }}
          />
          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <p id="catalogueDiscountTypeLabel" className="text-sm font-medium">{translateMessage("catalogue.changeDiscounts.typeLabel")}</p>
              <RadioGroup aria-labelledby="catalogueDiscountTypeLabel" className="flex w-auto flex-wrap gap-4 pb-1.5" value={discountType} onValueChange={(next) => change(setDiscountType)(next as DiscountTypeCode)}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="catalogueDiscountTypePercent" value={DiscountTypeCodes.percent} />
                  <Label htmlFor="catalogueDiscountTypePercent">{translateMessage("catalogue.changeDiscounts.typePercent")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="catalogueDiscountTypeAmount" value={DiscountTypeCodes.amount} />
                  <Label htmlFor="catalogueDiscountTypeAmount">{translateMessage("catalogue.changeDiscounts.typeAmount")}</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="w-56">
              {isPercent ? (
                <PercentageField label={translateMessage("catalogue.field.discountPercent")} name="catalogueDiscountPercent" value={discountPercent} onValueChange={change(setDiscountPercent)} isRequired />
              ) : (
                <WholeRupeeAmountField label={translateMessage("catalogue.changeDiscounts.discountAmount")} name="catalogueDiscountAmount" value={discountAmount} onValueChange={change(setDiscountAmount)} isRequired />
              )}
            </div>
          </div>
          {problemKey && <InlineNotice tone={ToneNames.warning}>{translateMessage(problemKey)}</InlineNotice>}
        </div>
      </SectionCard>
      <FormResultNotice errorMessage={errorMessage} successMessage={resultMessage} />
      <SectionCard
        title={translateMessage("catalogue.changeDiscounts.previewTitle")}
        isPadded={false}
        action={
          mayApply && (
            <Button type="button" disabled={!canList || discountProblem !== null || isApplying} onClick={() => setIsConfirming(true)}>
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
