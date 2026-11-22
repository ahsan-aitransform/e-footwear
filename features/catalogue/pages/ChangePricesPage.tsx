"use client";

import { useMemo, useRef, useState } from "react";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect } from "@/components/forms/OptionSelect";
import { PercentageField } from "@/components/forms/PercentageField";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { CatalogueFilterFields } from "../components/CatalogueFilterFields";
import { PostPreviewGrid } from "../components/PostPreviewGrid";
import { useCatalogueLookups } from "../hooks/useCatalogueLookups";
import { validateOldToNewPrices, validatePercentagePriceChange } from "../logic/priceChangeValidation";
import {
  PriceTypeCodes,
  type OldToNewPriceChangeRequest,
  type PercentagePriceChangeRequest,
  type PriceChangeAppliedResponse,
  type PriceChangeRowResponse,
  type ProductListFilterValues,
} from "../types/catalogueTypes";

export type ChangePricesMode = "oldToNew" | "percentage";

// Change Prices Old to New (docx 4.7) and Change Prices In % (docx 4.8). Both pick the products by department, category and brand,
// show the rows that will change with their new price, and apply the change as one batch. A sale price can be changed for the
// company list price or for one store; a purchase price is always company-wide. Applying asks for a confirmation, and the
// server answers with how many sizes changed and how many now overlap a discount (a conflict an administrator resolves).
export function ChangePricesPage({ mode }: { mode: ChangePricesMode }) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const lookups = useCatalogueLookups();
  const isOldToNew = mode === "oldToNew";
  const mayApply = hasPermission(isOldToNew ? PermissionCodes.PRODUCTS.CHANGE_PRICES_OLD_TO_NEW.EDIT : PermissionCodes.PRODUCTS.CHANGE_PRICES_BY_PERCENTAGE.EDIT);

  const [filter, setFilter] = useState<ProductListFilterValues>({});
  const [priceType, setPriceType] = useState<string>(PriceTypeCodes.sale);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [oldPrice, setOldPrice] = useState<number | null>(null);
  const [newPrice, setNewPrice] = useState<number | null>(null);
  const [increasePercent, setIncreasePercent] = useState<number | null>(null);
  const [decreasePercent, setDecreasePercent] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [resultMessage, setResultMessage] = useState<string>();
  // The same id is sent again when an apply is retried, so a lost answer cannot change prices twice.
  const transactionIdReference = useRef<string | null>(null);

  const validationKey = isOldToNew ? validateOldToNewPrices(oldPrice, newPrice) : validatePercentagePriceChange(increasePercent, decreasePercent);
  const effectiveStoreId = isOldToNew && priceType === PriceTypeCodes.purchase ? null : storeId;
  const isPurchase = isOldToNew && priceType === PriceTypeCodes.purchase;

  function buildRequest(clientTransactionId: string): OldToNewPriceChangeRequest | PercentagePriceChangeRequest {
    const common = { storeId: effectiveStoreId, departmentId: filter.departmentId ?? null, categoryId: filter.categoryId ?? null, brandId: filter.brandId ?? null, clientTransactionId };
    return isOldToNew
      ? { ...common, priceType: priceType as OldToNewPriceChangeRequest["priceType"], oldPrice: oldPrice ?? 0, newPrice: newPrice ?? 0 }
      : { ...common, increasePercent, decreasePercent };
  }

  // The preview needs a complete, valid entry; the all-zero id marks "not an apply".
  const previewBody = useMemo(
    () => (validationKey === null ? buildRequest("00000000-0000-0000-0000-000000000000") : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validationKey, isOldToNew, priceType, effectiveStoreId, filter.departmentId, filter.categoryId, filter.brandId, oldPrice, newPrice, increasePercent, decreasePercent],
  );

  function resetTransaction() {
    transactionIdReference.current = null;
    setResultMessage(undefined);
  }

  async function apply() {
    transactionIdReference.current ??= createClientTransactionId();
    const body = buildRequest(transactionIdReference.current);
    setIsApplying(true);
    setErrorMessage(undefined);
    const result = await apiRequest<PriceChangeAppliedResponse>(isOldToNew ? ApiEndpoints.productPrices.oldToNew : ApiEndpoints.productPrices.percentage, {
      method: "POST",
      body,
      idempotencyKey: body.clientTransactionId,
    });
    setIsApplying(false);
    setIsConfirming(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    transactionIdReference.current = null;
    const { changedVariantCount, conflictingVariantCount } = result.data;
    setResultMessage(
      translateMessage("catalogue.result.pricesChanged", { count: changedVariantCount }) +
        (conflictingVariantCount > 0 ? ` ${translateMessage("catalogue.result.conflicts", { count: conflictingVariantCount })}` : ""),
    );
    showToast(translateMessage("catalogue.toast.pricesChanged"), ToneNames.success);
    setRefreshCounter((counter) => counter + 1);
  }

  const columns = useMemo<DataGridColumn<PriceChangeRowResponse>[]>(
    () => [
      { key: "productCode", header: translateMessage("catalogue.field.productCode"), render: (row) => <span dir="ltr">{row.productCode}</span> },
      { key: "productName", header: translateMessage("catalogue.field.productName"), render: (row) => row.productName },
      { key: "sizeCode", header: translateMessage("catalogue.field.size"), render: (row) => row.sizeCode },
      { key: "barcode", header: translateMessage("catalogue.field.barcode"), isSecondary: true, render: (row) => <span dir="ltr">{row.barcode}</span> },
      { key: "categoryName", header: translateMessage("catalogue.field.category"), isSecondary: true, render: (row) => row.categoryName ?? "" },
      { key: "brandName", header: translateMessage("catalogue.field.brand"), isSecondary: true, render: (row) => row.brandName ?? "" },
      { key: "stockQuantity", header: translateMessage("catalogue.field.stock"), alignment: "end", isSecondary: true, render: (row) => formatQuantity(row.stockQuantity) },
      { key: "currentPrice", header: translateMessage("catalogue.changePrices.currentPrice"), alignment: "end", render: (row) => formatWholeRupees(row.currentPrice, { withSymbol: false }) },
      { key: "newPrice", header: translateMessage("catalogue.changePrices.newPrice"), alignment: "end", render: (row) => <strong>{formatWholeRupees(row.newPrice, { withSymbol: false })}</strong> },
    ],
    [translateMessage],
  );

  const titleKey = isOldToNew ? "navigation.item.changePricesOldToNew" : "navigation.item.changePricesByPercentage";
  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage(titleKey)} subtitle={translateMessage(isOldToNew ? "catalogue.changePrices.oldToNewSubtitle" : "catalogue.changePrices.percentageSubtitle")} />
      <SectionCard>
        <div className="space-y-4">
          <CatalogueFilterFields
            fields={["departmentId", "categoryId", "brandId"]}
            values={filter}
            onChange={(next) => {
              resetTransaction();
              setFilter(next);
            }}
            lookups={lookups}
          />
          <div className="grid gap-4 md:grid-cols-4">
            {isOldToNew && (
              <FormField label={translateMessage("catalogue.changePrices.priceType")} name="cataloguePriceType">
                {(controlProps) => (
                  <OptionSelect
                    {...controlProps}
                    value={priceType}
                    onValueChange={(next) => {
                      resetTransaction();
                      setPriceType(next);
                    }}
                    options={[
                      { value: PriceTypeCodes.sale, label: translateMessage("catalogue.changePrices.salePrice") },
                      { value: PriceTypeCodes.purchase, label: translateMessage("catalogue.changePrices.purchasePrice") },
                    ]}
                  />
                )}
              </FormField>
            )}
            <FormField label={translateMessage("catalogue.filter.store")} name="catalogueChangePricesStore" hint={translateMessage(isPurchase ? "catalogue.changePrices.purchaseCompanyWide" : "catalogue.changePrices.storeHint")}>
              {(controlProps) => (
                <SearchableSelect
                  {...controlProps}
                  options={lookups.storeOptions}
                  value={isPurchase ? null : storeId}
                  isClearable
                  isDisabled={isPurchase}
                  placeholder={translateMessage("catalogue.changePrices.allStoresListPrice")}
                  onValueChange={(next) => {
                    resetTransaction();
                    setStoreId(next);
                  }}
                />
              )}
            </FormField>
            {isOldToNew ? (
              <>
                <WholeRupeeAmountField label={translateMessage("catalogue.changePrices.oldPrice")} name="catalogueOldPrice" value={oldPrice} onValueChange={(next) => { resetTransaction(); setOldPrice(next); }} isRequired />
                <WholeRupeeAmountField label={translateMessage("catalogue.changePrices.newPrice")} name="catalogueNewPrice" value={newPrice} onValueChange={(next) => { resetTransaction(); setNewPrice(next); }} isRequired />
              </>
            ) : (
              <>
                <PercentageField label={translateMessage("catalogue.changePrices.increasePercent")} name="catalogueIncreasePercent" value={increasePercent} onValueChange={(next) => { resetTransaction(); setIncreasePercent(next); }} />
                <PercentageField label={translateMessage("catalogue.changePrices.decreasePercent")} name="catalogueDecreasePercent" value={decreasePercent} onValueChange={(next) => { resetTransaction(); setDecreasePercent(next); }} />
              </>
            )}
          </div>
          {validationKey !== null && (oldPrice !== null || newPrice !== null || increasePercent !== null || decreasePercent !== null) && (
            <InlineNotice tone={ToneNames.warning}>{translateMessage(validationKey)}</InlineNotice>
          )}
        </div>
      </SectionCard>
      <FormResultNotice errorMessage={errorMessage} successMessage={resultMessage} />
      <SectionCard
        title={translateMessage("catalogue.changePrices.previewTitle")}
        isPadded={false}
        action={
          mayApply && (
            <Button type="button" disabled={previewBody === null || isApplying} onClick={() => setIsConfirming(true)}>
              {translateMessage("catalogue.action.apply")}
            </Button>
          )
        }
      >
        <PostPreviewGrid<PriceChangeRowResponse>
          path={isOldToNew ? ApiEndpoints.productPrices.oldToNewPreview : ApiEndpoints.productPrices.percentagePreview}
          body={previewBody}
          columns={columns}
          getRowKey={(row) => row.variantId}
          caption={translateMessage("catalogue.changePrices.previewTitle")}
          emptyTitle={translateMessage("catalogue.changePrices.noRows")}
          emptyText={translateMessage("catalogue.changePrices.noRowsText")}
          idleText={translateMessage("catalogue.changePrices.fillIn")}
          refreshKey={refreshCounter}
        />
      </SectionCard>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        onConfirm={apply}
        isPending={isApplying}
        isDestructive={false}
        titleMessageKey="catalogue.changePrices.confirmTitle"
        descriptionMessageKey="catalogue.changePrices.confirmText"
        confirmLabelMessageKey="catalogue.action.apply"
      />
    </div>
  );
}
